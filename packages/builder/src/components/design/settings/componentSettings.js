import { Checkbox, Input, RadioGroup, Select, Stepper } from "@budibase/bbui"
import DrawerBindableInput from "@/components/common/bindings/DrawerBindableInput.svelte"
import MultilineDrawerBindableInput from "@/components/common/MultilineDrawerBindableInput.svelte"
import BarButtonList from "./controls/BarButtonList.svelte"
import ButtonActionEditor from "./controls/ButtonActionEditor/ButtonActionEditor.svelte"
import ButtonConditionEditor from "./controls/ButtonConditionEditor.svelte"
import ButtonConfiguration from "./controls/ButtonConfiguration/ButtonConfiguration.svelte"
import ColorPicker from "./controls/ColorPicker.svelte"
import BasicColumnEditor from "./controls/ColumnEditor/BasicColumnEditor.svelte"
import ColumnEditor from "./controls/ColumnEditor/ColumnEditor.svelte"
import TopLevelColumnEditor from "./controls/ColumnEditor/TopLevelColumnEditor.svelte"
import ComponentConfiguration from "./controls/ComponentConfiguration/ComponentConfiguration.svelte"
import DataProviderSelect from "./controls/DataProviderSelect.svelte"
import DataSourceSelect from "./controls/DataSourceSelect/DataSourceSelect.svelte"
import FieldConfiguration from "./controls/FieldConfiguration/FieldConfiguration.svelte"
import FieldSelect from "./controls/FieldSelect.svelte"
import FilterableSelect from "./controls/FilterableSelect.svelte"
import FilterConfiguration from "./controls/FilterConfiguration/FilterConfiguration.svelte"
import FilterEditor from "./controls/FilterEditor/FilterEditor.svelte"
import FormFieldSelect from "./controls/FormFieldSelect.svelte"
import FormStepConfiguration from "./controls/FormStepConfiguration.svelte"
import FormStepControls from "./controls/FormStepControls.svelte"
import GridColumnEditor from "./controls/GridColumnConfiguration/GridColumnConfiguration.svelte"
import { IconSelect } from "./controls/IconSelect"
import MultiFieldSelect from "./controls/MultiFieldSelect.svelte"
import StoreDataSourceSelect from "./controls/ObjectStoreDataSourceSelect.svelte"
import OptionsEditor from "./controls/OptionsEditor/OptionsEditor.svelte"
import { PhosphorIconSelect } from "./controls/PhosphorIconSelect"
import RelationshipFilterEditor from "./controls/RelationshipFilterEditor.svelte"
import SchemaSelect from "./controls/SchemaSelect.svelte"
import SearchFieldSelect from "./controls/SearchFieldSelect.svelte"
import SectionSelect from "./controls/SectionSelect.svelte"
import SortableFieldSelect from "./controls/SortableFieldSelect.svelte"
import TableConditionEditor from "./controls/TableConditionEditor.svelte"
import TableSelect from "./controls/TableSelect.svelte"
import URLSelect from "./controls/URLSelect.svelte"
import ValidationEditor from "./controls/ValidationEditor/ValidationEditor.svelte"

const componentMap = {
  text: DrawerBindableInput,
  "text/multiline": MultilineDrawerBindableInput,
  plainText: Input,
  select: Select,
  radio: RadioGroup,
  dataSource: DataSourceSelect,
  "dataSource/store": StoreDataSourceSelect,
  "dataSource/filterable": FilterableSelect,
  dataProvider: DataProviderSelect,
  boolean: Checkbox,
  number: Stepper,
  event: ButtonActionEditor,
  table: TableSelect,
  color: ColorPicker,
  icon: IconSelect,
  phosphorIcon: PhosphorIconSelect,
  field: FieldSelect,
  multifield: MultiFieldSelect,
  searchfield: SearchFieldSelect,
  options: OptionsEditor,
  schema: SchemaSelect,
  section: SectionSelect,
  filter: FilterEditor,
  "filter/relationship": RelationshipFilterEditor,
  url: URLSelect,
  fieldConfiguration: FieldConfiguration,
  filterConfiguration: FilterConfiguration,
  buttonConfiguration: ButtonConfiguration,
  componentConfiguration: ComponentConfiguration,
  stepConfiguration: FormStepConfiguration,
  formStepControls: FormStepControls,
  columns: ColumnEditor,
  // "Basic" actually includes nested JSON and relationship fields
  "columns/basic": BasicColumnEditor,
  // "Top level" is only the top level schema fields
  "columns/toplevel": TopLevelColumnEditor,
  "columns/grid": GridColumnEditor,
  tableConditions: TableConditionEditor,
  buttonConditions: ButtonConditionEditor,
  "field/sortable": SortableFieldSelect,
  "field/string": FormFieldSelect,
  "field/number": FormFieldSelect,
  "field/bigint": FormFieldSelect,
  "field/options": FormFieldSelect,
  "field/boolean": FormFieldSelect,
  "field/longform": FormFieldSelect,
  "field/datetime": FormFieldSelect,
  "field/attachment": FormFieldSelect,
  "field/attachment_single": FormFieldSelect,
  "field/fileupload": Input,
  "field/link": FormFieldSelect,
  "field/array": FormFieldSelect,
  "field/json": FormFieldSelect,
  "field/barcodeqr": FormFieldSelect,
  "field/bb_reference": FormFieldSelect,
  "field/bb_reference_single": FormFieldSelect,
  // Some validation types are the same as others, so not all types are
  // explicitly listed here. e.g. options uses string validation
  "validation/string": ValidationEditor,
  "validation/array": ValidationEditor,
  "validation/number": ValidationEditor,
  "validation/boolean": ValidationEditor,
  "validation/datetime": ValidationEditor,
  "validation/attachment": ValidationEditor,
  "validation/attachment_single": ValidationEditor,
  "validation/link": ValidationEditor,
  "validation/bb_reference": ValidationEditor,
}

export const getComponentForSetting = (setting) => {
  const { type, showInBar, barStyle } = setting || {}
  if (!type) {
    return null
  }

  // We can show a clone of the bar settings for certain select settings
  if (showInBar && type === "select" && barStyle === "buttons") {
    return BarButtonList
  }

  return componentMap[type]
}
