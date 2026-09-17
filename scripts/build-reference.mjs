import { readFileSync, writeFileSync } from 'node:fs'
import ts from 'typescript'
const groups = [
  ['Core types', 'packages/rcip/src/core/types.ts'],
  ['React types', 'packages/rcip/src/react/index.tsx'],
  ['Assist types', 'packages/rcip/src/assist/types.ts'],
  ['Assist orchestration', 'packages/rcip/src/assist/useRcipAssist.ts'],
  ['Assist UI', 'packages/rcip/src/assist/index.tsx'],
  ['Explorer', 'packages/rcip/src/explorer/index.tsx'],
]
let markdown =
  '---\ntitle: Complete TypeScript contracts\ndescription: Generated public RCIP TypeScript interfaces and type aliases for core, React, Assist, and Explorer.\n---\n# Complete TypeScript contracts\n\nGenerated from this release source. See the [API guide](./api) for usage and defaults.\n'
for (const [title, path] of groups) {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
  markdown += `\n## ${title}\n\n`
  for (const node of source.statements) {
    if (!(ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)))
      continue
    if (
      !node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    )
      continue
    markdown += `### ${node.name.text}\n\n\`\`\`ts\n${node.getFullText(source).trim()}\n\`\`\`\n\n`
  }
}
writeFileSync('docs/api-types.md', markdown)
writeFileSync(
  'docs/changelog.md',
  '---\ntitle: Changelog\ndescription: RCIP release history, compatibility changes, and runtime fixes.\n---\n' +
    readFileSync('CHANGELOG.md', 'utf8').replaceAll('(docs/', '('),
)
