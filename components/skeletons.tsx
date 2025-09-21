import React from 'react';

const SkeletonBox: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-slate-200 rounded animate-pulse ${className}`} />
);

export const AssetHeaderSkeleton: React.FC = () => (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full animate-pulse"></div>
                <div>
                    <SkeletonBox className="h-8 w-48 mb-2" />
                    <SkeletonBox className="h-6 w-24" />
                </div>
            </div>
            <div className="flex flex-col items-end gap-3">
                <div className="text-right">
                    <SkeletonBox className="h-8 w-32 mb-2" />
                    <SkeletonBox className="h-6 w-40" />
                </div>
                <SkeletonBox className="h-10 w-44" />
            </div>
        </div>
    </div>
);

export const AnalysisSkeleton: React.FC = () => (
     <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
        <h3 className="text-2xl font-semibold text-slate-800 border-b border-slate-200 pb-3 mb-4">Vectores de Análisis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-4">
                    <SkeletonBox className="h-6 w-3/4" />
                </div>
            ))}
        </div>
     </div>
);

export const AlternativesSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <SkeletonBox className="h-4 w-3/4 mb-2" />
                <SkeletonBox className="h-3 w-1/2 mb-4" />
                <SkeletonBox className="h-5 w-full mb-2" />
                <SkeletonBox className="h-4 w-1/3" />
            </div>
        ))}
    </div>
);