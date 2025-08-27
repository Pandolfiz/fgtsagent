import React from 'react';
import { CheckCircle } from 'lucide-react';

const StepIndicator = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="flex flex-col items-center mb-6">
      {/* ✅ TÍTULO: Indicador de etapas */}
      <h3 className="text-cyan-200 text-sm mb-4 font-medium">
        Clique nas etapas para navegar
      </h3>
      
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <button
                onClick={() => onStepClick(step.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-lg ${
                  currentStep === step.id
                    ? 'bg-cyan-400 border-cyan-400 text-gray-900 shadow-lg shadow-cyan-400/25'
                    : currentStep > step.id
                    ? 'bg-cyan-400 border-cyan-400 text-gray-900 hover:bg-cyan-300'
                    : 'border-cyan-400/50 text-cyan-400/50 hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-400/10'
                }`}
                title={`Clique para ir para ${step.title}`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step.id
                )}
              </button>
              <span className={`text-xs mt-1 font-medium transition-colors duration-200 ${
                currentStep === step.id 
                  ? 'text-cyan-300 font-semibold' 
                  : currentStep > step.id 
                  ? 'text-cyan-400 hover:text-cyan-300' 
                  : 'text-cyan-400/50 hover:text-cyan-400'
              }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-2 ${
                currentStep > step.id ? 'bg-cyan-400' : 'bg-cyan-400/30'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default StepIndicator;
