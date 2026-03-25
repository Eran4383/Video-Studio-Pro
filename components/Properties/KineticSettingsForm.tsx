import React from 'react';
import { KineticSettings } from '../../types/kinetic';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { LayoutTab } from './KineticTabs/LayoutTab';
import { FontsTab } from './KineticTabs/FontsTab';
import { ColorsTab } from './KineticTabs/ColorsTab';
import { AdvancedTab } from './KineticTabs/AdvancedTab';
import { BoundingBoxTab } from './KineticTabs/BoundingBoxTab';
import { EffectsTab } from './KineticTabs/EffectsTab';

interface KineticSettingsFormProps {
  settings: KineticSettings;
  onChange: (updates: Partial<KineticSettings>) => void;
}

type TabId = 'Layout' | 'Fonts' | 'Colors' | 'Effects' | 'Advanced' | 'BoundingBox';

export const KineticSettingsForm = ({ settings, onChange }: KineticSettingsFormProps) => {
  const { applySettingsToAllKineticBlocks } = useProjectStore();
  const [tabOrder, setTabOrder] = React.useState<TabId[]>(['Layout', 'Fonts', 'Colors', 'Effects', 'Advanced', 'BoundingBox']);

  const moveTab = (id: TabId, direction: 'up' | 'down') => {
    const index = tabOrder.indexOf(id);
    if (direction === 'up' && index > 0) {
      const newOrder = [...tabOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setTabOrder(newOrder);
    } else if (direction === 'down' && index < tabOrder.length - 1) {
      const newOrder = [...tabOrder];
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
      setTabOrder(newOrder);
    }
  };

  const renderTab = (id: TabId) => {
    const summary = (label: string) => (
      <summary className="cursor-pointer p-3 bg-zinc-800/50 hover:bg-zinc-800 font-semibold text-[11px] uppercase tracking-wider transition-colors list-none flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveTab(id, 'up'); }} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"><ChevronUp size={10} /></button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveTab(id, 'down'); }} className="p-1 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"><ChevronDown size={10} /></button>
          <span className="text-zinc-500 group-open:rotate-180 transition-transform ml-1">▼</span>
        </div>
      </summary>
    );

    switch (id) {
      case 'Layout':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden" open>
            {summary('Layout & Animation')}
            <LayoutTab settings={settings} onChange={onChange} />
          </details>
        );
      case 'Fonts':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Fonts')}
            <FontsTab settings={settings} onChange={onChange} />
          </details>
        );
      case 'Colors':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Colors')}
            <ColorsTab settings={settings} onChange={onChange} />
          </details>
        );
      case 'Effects':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Effects & Styles')}
            <EffectsTab settings={settings} onChange={onChange} />
          </details>
        );
      case 'Advanced':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Advanced')}
            <AdvancedTab settings={settings} onChange={onChange} />
          </details>
        );
      case 'BoundingBox':
        return (
          <details key={id} className="group mb-2 border border-zinc-800 rounded-md overflow-hidden">
            {summary('Bounding Box')}
            <BoundingBoxTab settings={settings} onChange={onChange} />
          </details>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-4">
      {tabOrder.map(id => renderTab(id))}

      <div className="mt-4 px-1">
        <button 
          onClick={() => applySettingsToAllKineticBlocks(settings)}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          Apply to all blocks in project
        </button>
      </div>
    </div>
  );
};
