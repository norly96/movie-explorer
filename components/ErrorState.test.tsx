import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./ErrorState";

describe("ErrorState", () => {
  it("renders the default message and a Try again action (RF-5)", () => {
    render(<ErrorState />);
    expect(
      screen.getByText(/couldn't load popular movies/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("renders a custom message when provided", () => {
    render(<ErrorState message="Something else went wrong." />);
    expect(screen.getByText("Something else went wrong.")).toBeInTheDocument();
  });

  it("defaults the Try again action to / (RF-10)", () => {
    render(<ErrorState />);
    expect(screen.getByRole("link", { name: /try again/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("points Try again at a custom retryHref when provided (RF-10)", () => {
    render(<ErrorState retryHref="/movie/42" />);
    expect(screen.getByRole("link", { name: /try again/i })).toHaveAttribute(
      "href",
      "/movie/42"
    );
  });

  describe("onRetry (RF-14)", () => {
    it("renders a button instead of the link when onRetry is passed", () => {
      render(<ErrorState onRetry={() => {}} />);

      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /try again/i })
      ).not.toBeInTheDocument();
    });

    it("calls onRetry when the button is clicked", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<ErrorState onRetry={onRetry} />);

      await user.click(screen.getByRole("button", { name: /try again/i }));

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it("takes precedence over retryHref when both are passed", () => {
      render(<ErrorState retryHref="/movie/42" onRetry={() => {}} />);

      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("keeps the message and the alert role", () => {
      render(<ErrorState message="Search failed." onRetry={() => {}} />);

      expect(screen.getByRole("alert")).toHaveTextContent("Search failed.");
    });

    it("is operable with the keyboard (RF-18)", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      render(<ErrorState onRetry={onRetry} />);

      await user.tab();
      expect(screen.getByRole("button", { name: /try again/i })).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });
});
