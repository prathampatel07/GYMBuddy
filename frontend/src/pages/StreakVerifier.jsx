import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { Flame, Upload, CheckCircle, Clock, X, Image, Loader, Shield, Zap, Camera, AlertTriangle } from 'lucide-react';

const STATUS_CONFIG = {
  verified: { label: 'Verified', icon: <CheckCircle className="w-3.5 h-3.5" />, cls: 'bg-gym-green/10 text-gym-green border-gym-green/30' },
  pending: { label: 'Pending Review', icon: <Clock className="w-3.5 h-3.5" />, cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-400/30' },
  rejected: { label: 'Rejected', icon: <X className="w-3.5 h-3.5" />, cls: 'bg-red-500/10 text-red-400 border-red-400/30' },
  failed: { label: 'Failed', icon: <AlertTriangle className="w-3.5 h-3.5" />, cls: 'bg-red-500/10 text-red-400 border-red-400/30' },
};

export default function StreakVerifier() {
  const qClient = useQueryClient();
  const fileRef = useRef();

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: streakData } = useQuery({
    queryKey: ['streakStatus'],
    queryFn: api.getStreakStatus,
  });

  const { data: proofHistory = [] } = useQuery({
    queryKey: ['proofHistory'],
    queryFn: api.getProofHistory,
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Only images are allowed'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    setIsUploading(true);
    const intervals = [20, 45, 68, 85, 95];
    let i = 0;
    const tick = () => {
      if (i < intervals.length) {
        setUploadProgress(intervals[i]);
        i++;
        setTimeout(tick, 300 + Math.random() * 200);
      }
    };
    tick();
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      simulateProgress();
      const formData = new FormData();
      formData.append('proof', selectedFile);
      return api.uploadStreakProof(formData);
    },
    onSuccess: () => {
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setSelectedFile(null);
        setPreview('');
        qClient.invalidateQueries({ queryKey: ['streakStatus'] });
        qClient.invalidateQueries({ queryKey: ['proofHistory'] });
        toast.success('🔥 Proof submitted! Your partner will verify it. +20 Coins on approval!', { duration: 5000 });
      }, 600);
    },
    onError: (err) => {
      setIsUploading(false);
      setUploadProgress(0);
      toast.error('Upload failed: ' + err.message);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: api.verifyPartnerProof,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['proofHistory'] });
      qClient.invalidateQueries({ queryKey: ['streakStatus'] });
      toast.success('✅ Partner verified! Both of you earn +20 Fitness Coins!', { duration: 5000 });
    },
    onError: (err) => toast.error('Verification failed: ' + err.message),
  });

  const today = new Date().toDateString();
  const submittedToday = proofHistory.some(p =>
    new Date(p.submittedAt).toDateString() === today && p.userId !== 'partner');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-orange-500/10 rounded-xl"><Flame className="w-7 h-7 text-orange-500" /></div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Streak Verification</h1>
          <p className="text-gray-400 text-sm">Daily proof keeps the streak alive and Coins coming</p>
        </div>
      </div>

      {/* Streak Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gym-card border border-gym-border p-5 rounded-2xl text-center">
          <Flame className="w-8 h-8 text-orange-500 mx-auto mb-2 fill-orange-500/20" />
          <p className="text-3xl font-black text-white">{streakData?.currentStreak || 0}</p>
          <p className="text-xs text-gray-500 font-bold uppercase mt-1">Current Streak</p>
        </div>
        <div className="bg-gym-card border border-gym-border p-5 rounded-2xl text-center">
          <Shield className="w-8 h-8 text-gym-green mx-auto mb-2" />
          <p className="text-3xl font-black text-white">{streakData?.longestStreak || 0}</p>
          <p className="text-xs text-gray-500 font-bold uppercase mt-1">Longest Streak</p>
        </div>
        <div className="bg-gym-card border border-gym-border p-5 rounded-2xl text-center">
          <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-3xl font-black text-white">{streakData?.totalVerified || 0}</p>
          <p className="text-xs text-gray-500 font-bold uppercase mt-1">Total Verified</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-gym-card border border-gym-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-gym-green" /> Submit Today's Proof
          </h2>
          {submittedToday && (
            <span className="flex items-center gap-1.5 text-xs bg-gym-green/10 border border-gym-green/30 text-gym-green px-3 py-1.5 rounded-full font-bold">
              <CheckCircle className="w-3.5 h-3.5" /> Submitted Today
            </span>
          )}
        </div>

        {!selectedFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gym-border hover:border-gym-green/40 rounded-2xl p-12 text-center cursor-pointer transition-all group bg-gym-dark/30 hover:bg-gym-green/5">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gym-border group-hover:bg-gym-green/10 transition-all flex items-center justify-center">
                <Image className="w-7 h-7 text-gray-500 group-hover:text-gym-green transition-colors" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Drop your gym selfie here</p>
                <p className="text-gray-500 text-sm mt-1">or <span className="text-gym-green underline">click to browse</span></p>
                <p className="text-gray-600 text-xs mt-2">JPG, PNG, WEBP · Max 10MB</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Preview */}
            <div className="relative inline-block w-full max-h-[300px] overflow-hidden rounded-2xl border border-gym-border">
              <img src={preview} alt="Preview" className="w-full object-cover max-h-[300px]" />
              <button onClick={() => { setSelectedFile(null); setPreview(''); }}
                className="absolute top-3 right-3 bg-gym-dark/80 hover:bg-red-500/80 text-white p-1.5 rounded-lg backdrop-blur-sm transition-all cursor-pointer">
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gym-dark/90 to-transparent p-4">
                <p className="text-white font-semibold text-sm">{selectedFile.name}</p>
                <p className="text-gray-400 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-gray-400">Uploading proof...</span>
                  <span className="text-gym-green">{uploadProgress}%</span>
                </div>
                <div className="h-2.5 bg-gym-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gym-green to-gym-teal rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 text-center">Uploading to secure cloud storage...</p>
              </div>
            )}

            {!isUploading && (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || submittedToday}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-500/90 text-white font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.2)] cursor-pointer disabled:opacity-50 text-base">
                <Upload className="w-5 h-5" /> Submit Streak Proof · +20 Coins
              </button>
            )}
          </div>
        )}
      </div>

      {/* Partner Verification Panel + History */}
      {proofHistory.length > 0 && (
        <div className="bg-gym-card border border-gym-border rounded-2xl p-6 space-y-5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-gym-green" /> Proof History
          </h2>

          <div className="space-y-3">
            {proofHistory.map((proof, idx) => {
              const cfg = STATUS_CONFIG[proof.status] || STATUS_CONFIG.pending;
              const isPartnerProof = proof.isPartnerProof;
              return (
                <div key={idx} className="flex items-center gap-4 bg-gym-dark/40 border border-gym-border/60 px-4 py-3.5 rounded-xl">
                  {/* Thumbnail */}
                  {proof.photoUrl ? (
                    <img src={proof.photoUrl} alt="Proof" className="w-12 h-12 object-cover rounded-lg border border-gym-border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-gym-border rounded-lg flex items-center justify-center shrink-0">
                      <Image className="w-5 h-5 text-gray-600" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{isPartnerProof ? '🤝 Partner' : '🙋 You'} · {new Date(proof.submittedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </div>
                  </div>

                  {/* Verify button (for partner's pending proofs) */}
                  {isPartnerProof && proof.status === 'pending' && (
                    <button
                      onClick={() => verifyMutation.mutate(proof._id)}
                      disabled={verifyMutation.isPending}
                      className="px-3 py-2 bg-gym-green/10 hover:bg-gym-green/20 border border-gym-green/30 text-gym-green text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer">
                      {verifyMutation.isPending ? <Loader className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Verify</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gym-dark/30 border border-gym-border/40 p-5 rounded-xl space-y-2.5 text-sm text-gray-400">
        <p className="font-bold text-white">How Streak Verification Works:</p>
        <div className="space-y-1.5">
          {[
            ['📸', 'Upload a gym selfie or workout photo to prove you worked out today'],
            ['🤝', 'Your partner reviews and verifies your submission within 24 hours'],
            ['🔥', 'Both partners earn +20 Fitness Coins and streak continues'],
            ['💡', 'Missing a day breaks the streak — keep each other accountable!'],
          ].map(([icon, text]) => (
            <p key={text}><span className="mr-1.5">{icon}</span>{text}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
