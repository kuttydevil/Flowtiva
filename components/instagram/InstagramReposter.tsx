
import React, { useState, useEffect } from 'react';
import { InstagramInstance, InstagramReposterJob } from '../../types';
import { db } from '../../firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { firebaseService } from '../../services/firebaseService';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { CreateReposterModal } from './CreateReposterModal';
import { useToast } from '../../contexts/ToastContext';

const RefreshIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0 0 11.667 0l3.181-3.183m-4.991-2.691v4.99" /></svg>;
const PlayIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z" /></svg>;
const PauseIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" {...props}><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Zm6.5 0a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" /></svg>;
const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;

interface InstagramReposterProps {
    instances: InstagramInstance[];
}

export const InstagramReposter: React.FC<InstagramReposterProps> = ({ instances }) => {
    const [jobs, setJobs] = useState<InstagramReposterJob[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        const q = query(collection(db, 'instagram_reposter_jobs'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(firebaseService.toInstagramReposterJob) as any;
            setJobs(data);
            setIsLoading(false);
        }, (err) => {
            addToast("Failed to fetch jobs.", { type: 'error' });
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleToggleStatus = async (job: InstagramReposterJob) => {
        const newStatus = job.status === 'active' ? 'paused' : 'active';
        try {
            await firebaseService.updateInstagramReposterJobStatus(job.id, newStatus);
            setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
            addToast(`Job ${newStatus === 'active' ? 'resumed' : 'paused'}.`, { type: 'info' });
        } catch (error: any) {
            addToast(error.message, { type: 'error' });
        }
    };

    const handleDelete = async (jobId: string) => {
        if (!confirm("Are you sure you want to delete this job? This will stop future reposts.")) return;
        try {
            await firebaseService.deleteInstagramReposterJob(jobId);
            setJobs(prev => prev.filter(j => j.id !== jobId));
            addToast("Job deleted.", { type: 'success' });
        } catch (error: any) {
            addToast(error.message, { type: 'error' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-brand-text-primary">Active Reposter Jobs</h2>
                <div className="flex gap-2">
                    <Button onClick={() => setIsModalOpen(true)}>New Job</Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
                </div>
            ) : jobs.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-brand-border rounded-lg">
                    <p className="text-brand-text-secondary">No reposter jobs configured.</p>
                    <Button variant="link" onClick={() => setIsModalOpen(true)}>Create one now</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map(job => (
                        <Card key={job.id} className="relative overflow-hidden">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg">@{job.target_username}</h3>
                                        <p className="text-xs text-brand-text-secondary">via @{job.instance_username}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${job.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                                        {job.status}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-brand-text-secondary">
                                    <p>Reposted: <span className="font-semibold text-brand-text-primary">{job.reposted_count || 0}</span> reels</p>
                                    <p>Max Limit: <span className="font-semibold text-brand-text-primary">{job.max_reels}</span></p>
                                    <p>Interval: <span className="font-semibold text-brand-text-primary">{job.repost_interval_minutes} mins</span></p>
                                    <p>Last Run: <span className="font-mono">{job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Pending'}</span></p>
                                </div>
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-brand-border">
                                    <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(job)}>
                                        {job.status === 'active' ? <PauseIcon className="w-4 h-4 mr-1"/> : <PlayIcon className="w-4 h-4 mr-1"/>}
                                        {job.status === 'active' ? 'Pause' : 'Resume'}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-status-red hover:bg-status-red/10" onClick={() => handleDelete(job.id)}>
                                        <TrashIcon className="w-4 h-4"/>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <CreateReposterModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onJobCreated={() => {}}
                instances={instances}
            />
        </div>
    );
};
