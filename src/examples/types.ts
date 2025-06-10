export type DemoMap = {
  'Editor': {
    updateContent: { P: string; R: void }
    getInfo: { P: void; R: { content: string; length: number } }
  }
  'Assistant': {}
}
