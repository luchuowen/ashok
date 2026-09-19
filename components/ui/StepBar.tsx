export function StepBar({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-line pb-6">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;

        return (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-tag border text-xs ${
                isActive
                  ? "border-oxblood bg-oxblood text-cream"
                  : isDone
                    ? "border-ink bg-ink text-cream"
                    : "border-line text-muted"
              }`}
            >
              {stepNumber}
            </span>
            <span className={`text-xs uppercase tracking-wide ${isActive ? "text-ink" : "text-muted"}`}>
              {step}
            </span>
            {stepNumber < steps.length ? (
              <span aria-hidden="true" className="mx-2 h-px w-6 bg-line" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
