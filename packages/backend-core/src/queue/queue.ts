import env from "../environment"
import { getRedisOptions } from "../redis/utils"
import { JobQueue } from "./constants"
import InMemoryQueue from "./inMemoryQueue"
import BullQueue, {
  Queue,
  QueueOptions,
  JobOptions,
  Job,
  DoneCallback,
} from "bull"
import { addListeners, StalledFn } from "./listeners"
import { Duration } from "../utils"
import * as timers from "../timers"

export type { QueueOptions, Queue, JobOptions } from "bull"

// the queue lock is held for 5 minutes
const QUEUE_LOCK_MS = Duration.fromMinutes(5).toMs()
// queue lock is refreshed every 30 seconds
const QUEUE_LOCK_RENEW_INTERNAL_MS = Duration.fromSeconds(30).toMs()
// cleanup the queue every 60 seconds
const CLEANUP_PERIOD_MS = Duration.fromSeconds(60).toMs()
let QUEUES: Queue[] = []
let cleanupInterval: NodeJS.Timeout

async function cleanup() {
  for (let queue of QUEUES) {
    await queue.clean(CLEANUP_PERIOD_MS, "completed")
    await queue.clean(CLEANUP_PERIOD_MS, "failed")
  }
}

export interface BudibaseQueueOpts<T> {
  removeStalledCb?: StalledFn
  maxStalledCount?: number
  jobOptions?: JobOptions
  jobTags?: (job: T) => Record<string, any>
}

export class BudibaseQueue<T> {
  private queue: Queue<T>
  private opts: BudibaseQueueOpts<T>
  private jobQueue: JobQueue

  constructor(jobQueue: JobQueue, opts: BudibaseQueueOpts<T> = {}) {
    this.opts = opts
    this.jobQueue = jobQueue
    this.queue = this.initQueue()
  }

  get name() {
    return this.queue.name
  }

  private initQueue() {
    const redisOpts = getRedisOptions()
    const queueConfig: QueueOptions = {
      redis: redisOpts,
      settings: {
        maxStalledCount: this.opts.maxStalledCount
          ? this.opts.maxStalledCount
          : 0,
        lockDuration: QUEUE_LOCK_MS,
        lockRenewTime: QUEUE_LOCK_RENEW_INTERNAL_MS,
      },
    }
    if (this.opts.jobOptions) {
      queueConfig.defaultJobOptions = this.opts.jobOptions
    }
    let queue: Queue<T>
    if (!env.isTest()) {
      queue = new BullQueue(this.jobQueue, queueConfig)
    } else if (
      process.env.BULL_TEST_REDIS_PORT &&
      !isNaN(+process.env.BULL_TEST_REDIS_PORT)
    ) {
      queue = new BullQueue(this.jobQueue, {
        ...queueConfig,
        redis: { host: "localhost", port: +process.env.BULL_TEST_REDIS_PORT },
      })
    } else {
      queue = new InMemoryQueue(this.jobQueue, queueConfig) as any
    }

    addListeners(queue, this.jobQueue, this.opts.removeStalledCb)
    QUEUES.push(queue)
    if (!cleanupInterval && !env.isTest()) {
      cleanupInterval = timers.set(cleanup, CLEANUP_PERIOD_MS)
      // fire off an initial cleanup
      cleanup().catch(err => {
        console.error(`Unable to cleanup ${this.jobQueue} initially - ${err}`)
      })
    }
    return queue
  }

  getBullQueue() {
    return this.queue
  }

  process(
    concurrency: number,
    cb: (job: Job<T>, done?: DoneCallback) => Promise<void>
  ): Promise<void>
  process(
    cb: (job: Job<T>, done?: DoneCallback) => Promise<void>
  ): Promise<void>
  process(...args: any[]) {
    let concurrency: number | undefined = undefined
    let cb: (job: Job<T>, done?: DoneCallback) => Promise<void>
    if (args.length === 2) {
      concurrency = args[0]
      cb = args[1]
    } else {
      cb = args[0]
    }

    const processCallback = async (job: Job<T>, done?: DoneCallback) => {
      if (done) {
        return cb(job, done)
      }
      return cb(job)
    }

    let wrappedCb
    if (cb.length === 1) {
      // If we pass a second parameter to the callback for queue.process, the call to done will be expected
      wrappedCb = (job: Job<T>) => processCallback(job)
    } else {
      wrappedCb = processCallback
    }

    if (concurrency) {
      return this.queue.process(concurrency, wrappedCb)
    } else {
      return this.queue.process(wrappedCb)
    }
  }

  async add(data: T, opts?: JobOptions): Promise<Job<T>> {
    return this.queue.add(data, opts)
  }

  close(doNotWaitJobs?: boolean) {
    return this.queue.close(doNotWaitJobs)
  }

  whenCurrentJobsFinished() {
    return this.queue.whenCurrentJobsFinished()
  }
}

export async function shutdown() {
  if (cleanupInterval) {
    timers.clear(cleanupInterval)
  }
  console.log("Waiting for current queue jobs to finish...")
  for (const queue of QUEUES) {
    await queue.whenCurrentJobsFinished()
  }
  console.log("Closing queue Redis connections...")
  for (const queue of QUEUES) {
    await queue.close()
  }
  QUEUES = []
  console.log("Queues shutdown")
}
