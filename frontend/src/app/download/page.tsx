import { permanentRedirect } from 'next/navigation';

export default function DownloadRedirect() {
  permanentRedirect('/');
}
