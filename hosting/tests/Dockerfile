FROM couchdb

ENV DATA_DIR /data
RUN mkdir /data

RUN apt-get update && \
  apt-get install -y --no-install-recommends redis-server

WORKDIR /minio
COPY --from=minio/minio:latest /usr/bin/minio /minio/minio

WORKDIR /

ADD dependencies/runner.sh .
RUN chmod +x ./runner.sh

EXPOSE 5984
EXPOSE 9000
EXPOSE 9001
EXPOSE 6379

CMD ["./runner.sh"]
