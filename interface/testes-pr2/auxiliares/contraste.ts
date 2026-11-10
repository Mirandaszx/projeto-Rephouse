import type { Locator } from '@playwright/test'

export async function contrast(locator: Locator, property: 'color' | 'borderTopColor' = 'color') {
  return locator.evaluate((element, property) => {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!
    function rgba(color: string) {
      context.clearRect(0, 0, 1, 1)
      context.fillStyle = color
      context.fillRect(0, 0, 1, 1)
      return [...context.getImageData(0, 0, 1, 1).data]
    }
    let ancestor: Element | null = element
    let background = [255, 255, 255, 255]
    while (ancestor) {
      const candidate = rgba(getComputedStyle(ancestor).backgroundColor)
      if (candidate[3] === 255) { background = candidate; break }
      ancestor = ancestor.parentElement
    }
    function luminance(channels: number[]) {
      return channels.slice(0, 3).map(value => {
        const channel = value / 255
        return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
      }).reduce((total, value, index) => total + value * [.2126, .7152, .0722][index]!, 0)
    }
    const front = luminance(rgba(getComputedStyle(element)[property]))
    const back = luminance(background)
    return (Math.max(front, back) + .05) / (Math.min(front, back) + .05)
  }, property)
}
