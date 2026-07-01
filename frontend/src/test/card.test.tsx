import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

describe("Card", () => {
  it("renders with children", () => {
    render(<Card><p>card content</p></Card>)
    expect(screen.getByText("card content")).toBeInTheDocument()
  })

  it("applies className", () => {
    const { container } = render(<Card className="custom-class" />)
    expect(container.firstChild).toHaveClass("custom-class")
  })
})

describe("CardHeader", () => {
  it("renders with title", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText("Test Title")).toBeInTheDocument()
  })
})

describe("CardContent", () => {
  it("renders children", () => {
    render(
      <Card>
        <CardContent>
          <span>content here</span>
        </CardContent>
      </Card>
    )
    expect(screen.getByText("content here")).toBeInTheDocument()
  })
})
