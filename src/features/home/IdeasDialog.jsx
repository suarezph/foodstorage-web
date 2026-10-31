import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Button, Dialog, ErrorNotice, Spinner } from '../../components/ui/index.jsx';
import { api } from '../../lib/api/client.js';

/**
 * "What can I cook?": three ideas from what expires this week (API ADR 0006). Asked each time it
 * opens; nothing is saved.
 */
export function IdeasDialog({ open, onClose }) {
  const ask = useMutation({ mutationFn: () => api('/ideas', { method: 'POST', body: {} }) });
  const { mutate, reset } = ask;

  useEffect(() => {
    if (open) mutate();
    else reset();
  }, [open, mutate, reset]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="What can I cook?"
      description="Ideas that use up what expires soonest. Check the dates before cooking."
    >
      {ask.isPending ? (
        <Spinner label="Thinking of ideas" />
      ) : ask.error ? (
        <ErrorNotice error={ask.error} />
      ) : ask.data ? (
        <div className="space-y-5">
          {ask.data.ideas.map((idea) => (
            <article key={idea.title} className="space-y-2">
              <h3 className="font-semibold">
                {idea.title}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  about {idea.minutes} min
                </span>
              </h3>
              {idea.why && <p className="text-sm text-muted-foreground">{idea.why}</p>}
              <p className="text-sm">
                <span className="font-medium">Uses:</span> {idea.uses.join(', ')}
                {idea.alsoNeeds.length > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium">Also needs:</span> {idea.alsoNeeds.join(', ')}
                  </>
                )}
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-sm">
                {idea.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </article>
          ))}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => mutate()}>
              Other ideas
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
