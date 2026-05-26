import React, { useState } from "react";

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [position, setPosition] = useState("");
  const [level, setLevel] = useState("");
  const [locationGranted, setLocationGranted] = useState(null);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationGranted(true);
          setStep(3);
        },
        () => {
          setLocationGranted(false);
          setStep(3);
        }
      );
    } else {
      setLocationGranted(false);
      setStep(3);
    }
  };

  const handleFinish = () => {
    onComplete({ position, level, locationGranted });
  };

  return (
    <div className="min-h-screen bg-[#F1EFE8] text-[#2C2C2A] flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Wordmark logo header */}
      <div className="pt-8">
        <h1 className="text-3xl font-black tracking-tighter text-left">stado</h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mt-1">
          Find your game. Show up and play.
        </p>
      </div>

      {/* Dynamic onboarding pages */}
      <div className="my-auto py-10">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black leading-tight text-gray-900">
              No WhatsApp chains. No half-empty parks.
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Open the app, view active matches near you, register your spot, and show up. Casual football coordinates here.
            </p>
            <div className="bg-[#E1F5EE] border border-[#1D9E75] p-3 rounded-lg text-xs text-[#085041] leading-relaxed">
              <strong>Join to Reveal Address:</strong> Exact details remain private until you commit, stopping spam pitches.
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">Choose your setup.</h2>
            
            <label className="block text-xs font-black uppercase tracking-wider text-gray-700">Preferred Position</label>
            <div className="grid grid-cols-2 gap-2">
              {["Striker", "Midfielder", "Defender", "Goalkeeper"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`py-3 text-xs font-bold rounded border ${
                    position === p 
                      ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" 
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mt-4">Skill Level</label>
            <div className="grid grid-cols-3 gap-2">
              {["Casual", "Intermediate", "Competitive"].map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`py-3 text-xs font-bold rounded border ${
                    level === l 
                      ? "border-[#1D9E75] bg-[#E1F5EE] text-[#085041]" 
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">Nearby match matching.</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              To match games within 2km, we require coordinate location access.
            </p>
            <div className="bg-[#E1F5EE] p-4 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-[#085041]">GPS Tracking Access</span>
              <button 
                onClick={requestLocation}
                className="bg-[#1D9E75] text-[#F1EFE8] text-xs font-bold px-4 py-2 rounded shadow"
              >
                Allow GPS
              </button>
            </div>
            {locationGranted === false && (
              <p className="text-xs text-red-600">
                Denied. You can manually input search suburbs instead.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation and state management */}
      <div className="pb-8 space-y-3">
        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 2 && (!position || !level)}
            className="w-full bg-[#1D9E75] disabled:opacity-50 text-white py-4 rounded font-bold tracking-wider transition-colors hover:bg-[#085041]"
          >
            CONTINUE
          </button>
        ) : (
          <button
            onClick={handleFinish}
            className="w-full bg-[#1D9E75] text-white py-4 rounded font-bold tracking-wider transition-colors hover:bg-[#085041]"
          >
            LET'S PLAY
          </button>
        )}
        
        {step > 1 && (
          <button
            onClick={() => setStep(step - 1)}
            className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-500 py-2 hover:text-[#2C2C2A]"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}