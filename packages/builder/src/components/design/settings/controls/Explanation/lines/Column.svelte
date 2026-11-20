<script>
import { FieldType } from "@supertoolmake/types"
import { FIELDS } from "@/constants/backend"
import subjects from "../subjects"
import { DocumentationLink, InfoWord, Line, Text } from "../typography"

export let schema
export let name
export let tableHref
export let setExplanationSubject

const getTypeName = (schema) => {
  const fieldDefinition = Object.values(FIELDS).find((f) => f.type === schema?.type)

  if (schema?.type === "jsonarray") {
    return "JSON Array"
  }
  if (schema?.type === "options") {
    return "Options"
  }

  return fieldDefinition?.name || schema?.type || "Unknown"
}

const getTypeIcon = (schema) => {
  const fieldDefinition = Object.values(FIELDS).find((f) => f.type === schema?.type)

  if (schema?.type === "jsonarray") {
    return "BracketsSquare"
  }

  return fieldDefinition?.icon || "Circle"
}

const getDocLink = () => "https://supertoolmake.com/docs/data/tables-and-columns"

// NOTE The correct indefinite article is based on the pronounciation of the word it precedes, not the spelling. So simply checking if the word begins with a vowel is not sufficient.

// e.g., `an honor`, `a user`
const getIndefiniteArticle = (schema) => {
  const anTypes = [
    FieldType.OPTIONS,
    null, // `null` gets parsed as "unknown"
    undefined, // `undefined` gets parsed as "unknown"
  ]

  if (anTypes.includes(schema?.type)) {
    return "an"
  }

  return "a"
}

$: columnTypeName = getTypeName(schema)
$: columnIcon = getTypeIcon(schema)
$: docLink = getDocLink()
$: indefiniteArticle = getIndefiniteArticle(schema)
</script>

<Line noWrap>
  <InfoWord
    on:mouseenter={() => setExplanationSubject(subjects.column)}
    on:mouseleave={() => setExplanationSubject(subjects.none)}
    href={tableHref}
    text={name}
  />
  <Text value={` is ${indefiniteArticle} `} />
  <DocumentationLink
    href={docLink}
    icon={columnIcon}
    text={columnTypeName}
  />
  <Text value=" column." />
</Line>
