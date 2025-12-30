import {
  Event,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent,
  UserPermissionAssignedEvent,
  UserPermissionRemovedEvent,
  DatasourceDeletedEvent,
  TableDeletedEvent,
  QueryDeletedEvent,
  WorkspaceAppDeletedEvent,
  ViewDeletedEvent,
} from "@budibase/types"

const getEventProperties: Record<
  string,
  (properties: any) => string | undefined
> = {
  [Event.USER_CREATED]: (properties: UserCreatedEvent) => properties.userId,
  [Event.USER_UPDATED]: (properties: UserUpdatedEvent) => properties.userId,
  [Event.USER_DELETED]: (properties: UserDeletedEvent) => properties.userId,
  [Event.USER_PERMISSION_ADMIN_ASSIGNED]: (
    properties: UserPermissionAssignedEvent
  ) => properties.userId,
  [Event.USER_PERMISSION_ADMIN_REMOVED]: (
    properties: UserPermissionRemovedEvent
  ) => properties.userId,
  [Event.USER_PERMISSION_BUILDER_ASSIGNED]: (
    properties: UserPermissionAssignedEvent
  ) => properties.userId,
  [Event.USER_PERMISSION_BUILDER_REMOVED]: (
    properties: UserPermissionRemovedEvent
  ) => properties.userId,
  [Event.DATASOURCE_DELETED]: (properties: DatasourceDeletedEvent) =>
    properties.datasourceId,
  [Event.TABLE_DELETED]: (properties: TableDeletedEvent) => properties.tableId,
  [Event.QUERY_DELETED]: (properties: QueryDeletedEvent) => properties.queryId,
  [Event.WORKSPACE_APP_DELETED]: (properties: WorkspaceAppDeletedEvent) =>
    properties.workspaceAppId,
  [Event.VIEW_DELETED]: (properties: ViewDeletedEvent) => properties.id,
}

export function getDocumentId(event: Event, properties: any) {
  const extractor = getEventProperties[event]
  if (!extractor) {
    throw new Error("Event does not have a method of document ID extraction")
  }
  return extractor(properties)
}
