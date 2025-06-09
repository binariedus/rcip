import { UIActionProvider } from '@lib/context/UIActionProvider'
import { ArticleEditor } from './ArticleEditor'
import { AssistantPanel } from './AssistantPanel'

export function App() {
  return (
    <UIActionProvider>
      <ArticleEditor />
      <AssistantPanel />
    </UIActionProvider>
  )
}
