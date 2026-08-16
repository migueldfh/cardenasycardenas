import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from './StatusBadge';

const meta = {
  title: 'Shared/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof StatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Production: Story = {
  args: {
    status: 'production',
  },
};

export const Paused: Story = {
  args: {
    status: 'paused',
  },
};

export const Completed: Story = {
  args: {
    status: 'completed',
  },
};
