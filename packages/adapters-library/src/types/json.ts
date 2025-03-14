export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [prop: string]: Json }
