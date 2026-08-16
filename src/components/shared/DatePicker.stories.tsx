import type { Meta, StoryObj } from '@storybook/react';
import { DatePicker } from './DatePicker';
import { useState } from 'react';

const meta = {
  title: 'Shared/DatePicker',
  component: DatePicker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    setDate: () => {},
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return <DatePicker date={date} setDate={setDate} />;
  },
};
