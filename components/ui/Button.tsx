import Link from "next/link";

type CommonProps = {
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

type ButtonAsLink = CommonProps & {
  href: string;
  /** Filename to save as — forces a plain <a download> instead of next/link,
   *  which doesn't honor the download attribute. Used for generated files
   *  (e.g. a data: URI .ics), never for internal navigation. */
  download?: string;
  /** Opens the link in a new tab — for external destinations (e.g. Google
   *  Calendar) so we don't navigate the visitor away from the site. */
  target?: "_blank";
  rel?: string;
  onClick?: never;
  type?: never;
  disabled?: never;
};

type ButtonAsButton = CommonProps & {
  href?: undefined;
  download?: never;
  target?: never;
  rel?: never;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const { children, variant = "primary", className = "" } = props;
  const classes = `cta ${variant === "ghost" ? "ghost" : ""} ${className}`.trim();

  if (props.href) {
    if (props.download) {
      return (
        <a href={props.href} download={props.download} className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={classes} target={props.target} rel={props.rel}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={classes}
    >
      {children}
    </button>
  );
}
