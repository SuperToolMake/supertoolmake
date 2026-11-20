<script>
import subjects from "../subjects"
import { DocumentationLink, InfoWord, Line, Space, Text } from "../typography"

export let setExplanationSubject
</script>

<Line>
  <Text value="No " />
  <InfoWord
    on:mouseenter={() => setExplanationSubject(subjects.notRequired)}
    on:mouseleave={() => setExplanationSubject(subjects.none)}
    text="required"
  />
  <Space />
  <DocumentationLink
    icon="database-slash"
    href="https://supertoolmake.com/docs/data/tables-and-columns"
    text="Constraint"
  />
  <Text value=", so values may be missing." />
</Line>

<style>
</style>
