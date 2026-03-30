import type { CreateRowActionRequest, RowActionResponse, RowActionsResponse } from "@budibase/types"
import type { BaseAPIClient } from "./types"

export interface RowActionEndpoints {
  fetch: (tableId: string) => Promise<Record<string, RowActionResponse>>
  create: (tableId: string, name: string) => Promise<RowActionResponse>
  delete: (tableId: string, rowActionId: string) => Promise<void>
}

export const buildRowActionEndpoints = (API: BaseAPIClient): RowActionEndpoints => ({
  /**
   * Gets the available row actions for a table.
   * @param tableId the ID of the table
   */
  fetch: async (tableId) => {
    return (
      await API.get<RowActionsResponse>({
        url: `/api/tables/${tableId}/actions`,
      })
    ).actions
  },

  /**
   * Creates a row action.
   * @param name the name of the row action
   * @param tableId the ID of the table
   */
  create: async (tableId, name) => {
    return await API.post<CreateRowActionRequest, RowActionResponse>({
      url: `/api/tables/${tableId}/actions`,
      body: {
        name,
      },
    })
  },

  /**
   * Deletes a row action.
   * @param tableId the ID of the table
   * @param rowActionId the ID of the row action to delete
   */
  delete: async (tableId, rowActionId) => {
    return await API.delete({
      url: `/api/tables/${tableId}/actions/${rowActionId}`,
    })
  },
})
