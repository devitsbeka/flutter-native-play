import { Fragment, type ReactNode } from "react";
import { splitRich } from "../richText";

export function RichText({ text }: { text: string }): ReactNode {
  return (
    <>
      {splitRich(text).map((p, i) =>
        p.bold ? (
          <strong key={i} style={{ fontWeight: 700 }}>
            {p.text}
          </strong>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
