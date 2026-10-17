// apps/web/app/tv/page.tsx
import WaitingRoomTvView from '../../components/WaitingRoomTvView';

export const metadata = {
  title: 'Waiting Room TV Display — HPC Jashore',
  description: 'Live token feed and now-serving display for patient waiting hall',
};

export default function TvPage() {
  return <WaitingRoomTvView />;
}
