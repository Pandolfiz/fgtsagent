import React from 'react';
import { CheckCircle } from 'lucide-react';

const StepIndicator = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="flex flex-col items-center mb-1 sm:mb-1.5">
      {/* ✅ TÍTULO: Indicador de etapas - ULTRA COMPACTO */}
      <h3 className="text-cyan-200 text-xs mb-1 font-medium text-center">
        Clique nas etapas para navegar
      </h3>
      
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <button
                onClick={() => onStepClick(step.id)}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md ${
                  currentStep === step.id
                    ? 'bg-cyan-400 border-cyan-400 text-gray-900 shadow-md shadow-cyan-400/25'
                    : currentStep > step.id
                    ? 'bg-cyan-400 border-cyan-400 text-gray-900 hover:bg-cyan-300'
                    : 'border-cyan-400/50 text-cyan-400/50 hover:border-cyan-400 hover:text-cyan-400 hover:bg-cyan-400/10'
                }`}
                title={`Clique para ir para ${step.title}`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="w-1 h-1 sm:w-1.5 sm:h-1.5" />
                ) : (
                  <span className="text-xs font-medium">{step.id}</span>
                )}
              </button>
              <span className={`text-xs mt-0.5 font-medium transition-colors duration-200 text-center ${
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
              <div className={`w-2 sm:w-3 h-px mx-0.5 sm:mx-1 ${
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
