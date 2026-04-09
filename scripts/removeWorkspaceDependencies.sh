#!/bin/sh

packages_to_remove="@supertoolmake/backend-core @supertoolmake/bbui @supertoolmake/builder @supertoolmake/client @supertoolmake/frontend-core @supertoolmake/sdk @supertoolmake/server @supertoolmake/shared-core @supertoolmake/string-templates @supertoolmake/types @supertoolmake/worker"

package_json_path="$1"

process_package() {
  pkg_path="$1"

  for package_name in $packages_to_remove; do
    jq "del(.dependencies[\"$package_name\"])" $pkg_path > tmp_file.json && mv tmp_file.json $pkg_path
    jq "del(.resolutions[\"$package_name\"])" $pkg_path > tmp_file.json && mv tmp_file.json $pkg_path
  done
}

process_package "$package_json_path"
