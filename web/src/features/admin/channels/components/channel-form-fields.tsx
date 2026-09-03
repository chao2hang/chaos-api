/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

*/

import type { UseFormReturn } from 'react-hook-form'

import type { ChannelFormValues } from '../lib/schema'
import { ChannelFormBasicFields } from './channel-form-basic-fields'
import { ChannelFormExtraFields } from './channel-form-extra-fields'

export interface ChannelFormFieldsProps {
  form: UseFormReturn<ChannelFormValues>
  groups: string[]
  fetching: boolean
  onFetchModels: () => void
}

/** All body fields of the create/edit channel form. */
export function ChannelFormFields(props: ChannelFormFieldsProps) {
  return (
    <>
      <ChannelFormBasicFields
        form={props.form}
        groups={props.groups}
        fetching={props.fetching}
        onFetchModels={props.onFetchModels}
      />
      <ChannelFormExtraFields form={props.form} groups={props.groups} />
    </>
  )
}
