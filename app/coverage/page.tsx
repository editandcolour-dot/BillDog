import fs from 'fs';
import path from 'path';

export const dynamic = 'force-static'; // Can generate safely at build time
export const revalidate = 3600; // Refetch hourly

async function getMunicipalityIndex() {
  const filePath = path.join(process.cwd(), 'lib/tariff/data/MUNICIPALITY_INDEX.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export default async function CoveragePage() {
  const index = await getMunicipalityIndex();
  
  const getBadge = (coverage: string) => {
    switch (coverage) {
      case 'COMPLETE':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">🟢 VERIFIED</span>;
      case 'PARTIAL':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">🟡 MONITORED</span>;
      case 'LEGAL_HOLD':
      case 'STUB':
      case 'ESKOM_SUPPLY':
      case 'NOT_STARTED':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">🔴 UNDISCLOSED</span>;
    }
  };

  const mapCategory = (obj: Record<string, any>) => {
    return Object.entries(obj).map(([key, data]) => (
      <div key={key} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 rounded transition-colors duration-150">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 font-dmsans">{data.name}</h3>
          <p className="text-xs text-gray-500">{data.province} • {data.electricity_distributor}</p>
        </div>
        <div>{getBadge(data.coverage)}</div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bebas text-gray-900 tracking-tight mb-4">National Coverage Map</h1>
          <p className="text-lg text-gray-600 font-dmsans max-w-2xl mx-auto">
            We hold municipalities accountable by verifying their rates against legally gazetted tariffs. 
            Below is the current disclosure and verification status of South African municipalities.
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bebas text-gray-900 tracking-wide">Metropolitan Municipalities</h2>
          </div>
          <div className="p-4">
            {mapCategory(index.metros || {})}
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bebas text-gray-900 tracking-wide">Secondary Municipalities & Local Councils</h2>
          </div>
          <div className="p-4">
            {mapCategory(index.secondary_municipalities || {})}
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500 font-dmsans">
          <p>Last Updated: {index.last_updated} • Total Municipalities Tracked: {index.total_municipalities}</p>
        </div>
      </div>
    </div>
  );
}
