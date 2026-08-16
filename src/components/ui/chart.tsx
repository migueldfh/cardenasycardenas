import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

// Format: { [key: string]: { label: string; color?: string; icon?: React.ComponentType } }
export type ChartConfig = {
  [key: string]: {
    label: React.ReactNode
    icon?: React.ComponentType
    color?: string
  }
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer")
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig
    children: React.ReactNode
  }
>(({ id, className, config, children, ...props }, ref) => {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-area]:fill-opacity-10 [&_.recharts-dot]:stroke-background [&_.recharts-layer]:outline-none [&_.recharts-sector_path]:outline-none [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children as any}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.color
  )

  if (colorConfig.length === 0) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .map(([key, item]) => {
            if (!item.color) return ""
            return `
              [data-chart="${id}"] {
                --color-${key}: ${item.color};
              }
              .chart-${key} {
                fill: var(--color-${key});
                stroke: var(--color-${key});
              }
            `
          })
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean
    payload?: any[]
    label?: string
    labelFormatter?: (label: any) => React.ReactNode
    formatter?: (value: any, name: any, item: any, index: any) => React.ReactNode
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }
>(
  (
    {
      className,
      active,
      payload,
      label,
      labelFormatter,
      formatter,
      hideLabel = false,
      hideIndicator = false,
      indicator = "dot",
      nameKey,
      labelKey,
      ...props
    },
    ref
  ) => {
    const { config } = useChart()

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) {
        return null
      }

      const [item] = payload
      const key = `${labelKey || item.dataKey || "value"}`
      const itemConfig = config[key]
      const value =
        labelKey && itemConfig
          ? itemConfig.label
          : label

      if (labelFormatter) {
        return (
          <div className="font-medium">{labelFormatter(value)}</div>
        )
      }

      if (!value) {
        return null
      }

      return <div className="font-medium">{value}</div>
    }, [label, labelFormatter, payload, hideLabel, labelKey, config])

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
        {...props}
      >
        {tooltipLabel}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = config[key]
            const indicatorColor = itemConfig?.color || item.payload.fill || item.color

            return (
              <div
                key={item.dataKey}
                className="flex w-full items-center gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
              >
                {itemConfig?.icon ? (
                  <itemConfig.icon />
                ) : (
                  !hideIndicator && (
                    <div
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-[2px]",
                        indicator === "dot" && "rounded-full",
                        indicator === "line" && "h-0.5",
                        indicator === "dashed" && "border-t border-dashed"
                      )}
                      style={{
                        backgroundColor: indicatorColor,
                      }}
                    />
                  )
                )}
                <div className="flex flex-1 justify-between gap-1.5 leading-none">
                  <span className="text-muted-foreground">
                    {itemConfig?.label || item.name}
                  </span>
                  {item.value !== undefined && (
                    <span className="font-semibold text-foreground">
                      {formatter ? formatter(item.value, key, item, index) : item.value}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: any[]
    verticalAlign?: "top" | "bottom"
    nameKey?: string
  }
>(({ className, payload, verticalAlign = "bottom", nameKey, ...props }, ref) => {
  const { config } = useChart()

  if (!payload?.length) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className
      )}
      {...props}
    >
      {payload.map((item) => {
        const key = `${nameKey || item.dataKey || "value"}`
        const itemConfig = config[key]

        return (
          <div
            key={item.value}
            className="flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
          >
            {itemConfig?.icon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: itemConfig?.color || item.color,
                }}
              />
            )}
            <span className="text-muted-foreground text-xs leading-none">
              {itemConfig?.label || item.value}
            </span>
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
