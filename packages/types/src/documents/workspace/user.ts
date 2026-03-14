import type { ContextUser } from "../../sdk"
import type { User } from "../global"
import type { Row } from "./row"

export type UserMetadata = User & Row
export type ContextUserMetadata = ContextUser & Row
