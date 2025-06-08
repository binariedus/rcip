export type AppMap = {
  MainInput: {
    updateValue: { P: string; R: void }
    getInfo: { P: void; R: { value: string } }
  }
  DevTrigger: {
    syncValue: { P: string; R: void }
  }
}
