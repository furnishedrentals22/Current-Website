import { useState } from 'react';
import { Users, ChevronDown, ChevronRight } from 'lucide-react';
import { sortUnitsNumerically, getQuarterLabel, getQuarterSortKey, pastColumns, renderTableHeader } from './tenantUtils';
import { TenantPastRow } from './TenantRow';

export function PastTenantsTab({
  pastTenants, sortedProperties, unitsByProperty, pastGrouped,
  unitMap, pastSortMode, setPastSortMode, onDetail, onEdit, onDelete
}) {
  const [expandedPastProps, setExpandedPastProps] = useState({});
  const [expandedPastUnits, setExpandedPastUnits] = useState({});
  const [expandedQuarters, setExpandedQuarters] = useState({});

  return (
    <>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[12px] font-medium text-muted-foreground">Sort By:</span>
        <div className="flex rounded-md border border-border/70 overflow-hidden">
          <button
            className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${pastSortMode === 'by-unit' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/40'}`}
            onClick={() => setPastSortMode('by-unit')}
            data-testid="past-sort-by-unit"
          >By Unit</button>
          <button
            className={`px-3 py-1.5 text-[12px] font-medium transition-colors border-l border-border/70 ${pastSortMode === 'by-moveout' ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted/40'}`}
            onClick={() => setPastSortMode('by-moveout')}
            data-testid="past-sort-by-moveout"
          >By Move-Out Date</button>
        </div>
      </div>
      <div className="rounded-lg border border-border/70 bg-[hsl(36,33%,97%)] overflow-hidden" data-testid="past-tenants-table">
        {pastSortMode === 'by-unit'
          ? <PastByUnit pastTenants={pastTenants} sortedProperties={sortedProperties} unitsByProperty={unitsByProperty} pastGrouped={pastGrouped} unitMap={unitMap} expandedPastProps={expandedPastProps} setExpandedPastProps={setExpandedPastProps} expandedPastUnits={expandedPastUnits} setExpandedPastUnits={setExpandedPastUnits} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />
          : <PastByMoveOut pastTenants={pastTenants} unitMap={unitMap} expandedQuarters={expandedQuarters} setExpandedQuarters={setExpandedQuarters} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />
        }
      </div>
    </>
  );
}

function PastByUnit({ pastTenants, sortedProperties, unitsByProperty, pastGrouped, unitMap, expandedPastProps, setExpandedPastProps, expandedPastUnits, setExpandedPastUnits, onDetail, onEdit, onDelete }) {
  if (pastTenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No past tenants</p>
      </div>
    );
  }

  return sortedProperties.map(prop => {
    const propId = prop.id;
    const pastInProp = pastGrouped[propId];
    if (!pastInProp) return null;

    const propUnits = unitsByProperty[propId] || [];
    const totalPastInProp = Object.values(pastInProp).flat().length;
    const isExpanded = expandedPastProps[`past-${propId}`];

    return (
      <div key={propId} className="mb-3 rounded-lg border border-border/60 bg-card shadow-sm overflow-hidden" data-testid={`past-property-group-${propId}`}>
        <button
          className="w-full flex items-center gap-3 px-4 py-3 text-left bg-slate-100 hover:bg-slate-200 transition-colors border-b border-border/40"
          onClick={() => setExpandedPastProps(prev => ({ ...prev, [`past-${propId}`]: !prev[`past-${propId}`] }))}
          data-testid={`past-property-toggle-${propId}`}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span className="text-[13px] font-semibold">{prop.address || prop.name}</span>
          <span className="text-[11px] text-muted-foreground">{totalPastInProp} past tenants</span>
        </button>

        {isExpanded && (
          <div>
            {sortUnitsNumerically(propUnits.filter(u => pastInProp[u.id])).map(unit => {
              const unitId = unit.id;
              const unitPast = (pastInProp[unitId] || []).sort((a, b) => b.move_out_date.localeCompare(a.move_out_date));
              if (unitPast.length === 0) return null;

              const unitKey = `past-unit-${unitId}`;
              const isUnitExpanded = expandedPastUnits[unitKey];

              return (
                <div key={unitId} className="border-t border-border/30">
                  <button
                    className="w-full flex items-center gap-2 px-6 py-2 text-left hover:bg-muted/20 transition-colors"
                    onClick={() => setExpandedPastUnits(prev => ({ ...prev, [unitKey]: !prev[unitKey] }))}
                    data-testid={`past-unit-toggle-${unitId}`}
                  >
                    {isUnitExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className="text-[12px] font-medium">Unit {unit.unit_number}</span>
                    <span className="text-[11px] text-muted-foreground">{unitPast.length} tenants</span>
                  </button>
                  {isUnitExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        {renderTableHeader(pastColumns)}
                        <tbody>{unitPast.map((t, idx) => <TenantPastRow key={t.id} tenant={t} unitMap={unitMap} idx={idx} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />)}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  });
}

function PastByMoveOut({ pastTenants, unitMap, expandedQuarters, setExpandedQuarters, onDetail, onEdit, onDelete }) {
  if (pastTenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Users className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No past tenants</p>
      </div>
    );
  }

  const quarterGroups = {};
  pastTenants.forEach(t => {
    const qLabel = getQuarterLabel(t.move_out_date);
    const qKey = getQuarterSortKey(t.move_out_date);
    if (!quarterGroups[qKey]) quarterGroups[qKey] = { label: qLabel, tenants: [] };
    quarterGroups[qKey].tenants.push(t);
  });

  const sortedQuarters = Object.entries(quarterGroups).sort((a, b) => b[0].localeCompare(a[0]));

  return sortedQuarters.map(([qKey, { label, tenants: qTenants }]) => {
    const sorted = [...qTenants].sort((a, b) => b.move_out_date.localeCompare(a.move_out_date));
    const isExpanded = expandedQuarters[qKey];

    return (
      <div key={qKey} className="border-b border-border/60" data-testid={`quarter-group-${qKey}`}>
        <button
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors"
          onClick={() => setExpandedQuarters(prev => ({ ...prev, [qKey]: !prev[qKey] }))}
          data-testid={`quarter-toggle-${qKey}`}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span className="text-[13px] font-semibold">{label}</span>
          <span className="text-[11px] text-muted-foreground">{sorted.length} tenants</span>
        </button>
        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {renderTableHeader(pastColumns)}
              <tbody>{sorted.map((t, idx) => <TenantPastRow key={t.id} tenant={t} unitMap={unitMap} idx={idx} onDetail={onDetail} onEdit={onEdit} onDelete={onDelete} />)}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  });
}
