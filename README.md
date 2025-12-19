<h1>
  Babibudi 🐤
</h1>

<h3>
  A light weight fork of <a href="https://github.com/Budibase/budibase">Budibase</a>. 
</h3>
<p>
  <ul>
    ✔️ Includes the app builder for client apps
    <br />✖️ Excludes the pro module
    <br />✖️ Excludes the internal DB
    <br />✖️ Excludes automations
    <br />✖️ Excludes plugins
    <br />✖️ Excludes user groups
  </ul>
</p>

Forked from release [3.23.42](https://github.com/Budibase/budibase/releases/tag/3.23.42)

<h3>
  Local development
</h3>
<p>
  To run locally, you will need to have <b>docker</b> installed.

If you are not using _Docker Desktop_, you can use [Colima](https://github.com/abiosoft/colima).
<br />Run `colima start` to spin up the docker runtime.

Also ensure your IDE has permissions for mounting the volumes defined in <a href="/hosting/docker-compose.dev.yaml">docker-compose.dev.yaml</a>.
<br />For example, in macOS I had to do this via `Privacy & Security > Files & Folders`

</p>

<h4>Starting</h4>

`yarn` - installs the dependencies
<br />`yarn dev` - runs Babibudi locally

You will know yarn dev has worked correctly when there are no build errors of course, but also you will see the following containers running:

- budi-nginx-dev
- budi-couchdb3-dev
- budi-redis-dev
- budi-minio-dev (note to self: can I remove this?)

Once running, visit [localhost:10000/builder](http://localhost:10000/builder)

You should be prompted to create a super admin:

<img src="docs/super_admin.png" width="640">
