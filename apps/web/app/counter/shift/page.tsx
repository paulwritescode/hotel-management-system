import type { Metadata } from 'next'
import { MyShift } from './my-shift'

export const metadata: Metadata = { title: 'My shift' }
export default function ShiftPage() { return <MyShift /> }
