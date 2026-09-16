import { useEffect, useState } from 'react';
import { ContextHelp as SharedContextHelp } from '@openent/context-help/react';
import catalogue from '../../public/public/help/fr.json';

export function ContextHelp() {
  const entry = catalogue.entries['rack.deposer-document'];
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  // Stable ENT endpoint: the destination is resolved server-side on every click.
  const endpoint = '/dashboard/api/documentation';
  const link = `${endpoint}?helpId=rack.deposer-document`;
  if (!origin) return <a href={link} target="_blank" rel="noopener noreferrer">{entry.title}</a>;
  return <SharedContextHelp helpId="rack.deposer-document" label={entry.title}
    catalogueUrl={`${endpoint}?format=catalogue`}
    docUrl={`${origin}${link}`} />;
}
