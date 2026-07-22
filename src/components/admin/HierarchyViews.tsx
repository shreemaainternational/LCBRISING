'use client';

import { useState } from 'react';
import { SlidersHorizontal, ListTree } from 'lucide-react';
import { HierarchyExplorer, type CaNode, type MdNode, type DistrictNode } from './HierarchyExplorer';
import { RegionZoneConsole } from './RegionZoneConsole';

/**
 * Two ways to work the same structure:
 *  • Console — portal-style batch reparent + staged Save / Start Over.
 *  • Tree    — expandable explorer with inline Add / Edit at every level.
 */
export function HierarchyViews({
  cas = [], looseMds = [], looseDistricts = [],
}: { cas?: CaNode[]; looseMds?: MdNode[]; looseDistricts?: DistrictNode[] }) {
  const [tab, setTab] = useState<'console' | 'tree'>('console');
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border bg-white p-1 shadow-sm">
        <TabBtn active={tab === 'console'} onClick={() => setTab('console')} icon={SlidersHorizontal}>Console</TabBtn>
        <TabBtn active={tab === 'tree'} onClick={() => setTab('tree')} icon={ListTree}>Tree</TabBtn>
      </div>
      {tab === 'console'
        ? <RegionZoneConsole cas={cas} looseMds={looseMds} looseDistricts={looseDistricts} />
        : <HierarchyExplorer cas={cas} looseMds={looseMds} looseDistricts={looseDistricts} />}
    </div>
  );
}

function TabBtn({
  active, onClick, icon: Icon, children,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${active ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
      <Icon size={14} /> {children}
    </button>
  );
}
