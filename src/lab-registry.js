/* Independently verified experiments share one interaction shell. */
const ExtensionLabs = [
 ...(typeof ConsistencyLabs === 'undefined' ? [] : ConsistencyLabs),
 ...(typeof StateLabs === 'undefined' ? [] : StateLabs),
 ...(typeof FoundationConditionLabs === 'undefined' ? [] : FoundationConditionLabs),
 ...(typeof ConsolidationLabs === 'undefined' ? [] : ConsolidationLabs),
 ...(typeof StrengthStressLabs === 'undefined' ? [] : StrengthStressLabs),
 ...(typeof SeepageLabs === 'undefined' ? [] : SeepageLabs),
 ...(typeof BearingExtensionLabs === 'undefined' ? [] : BearingExtensionLabs),
 ...(typeof RetainingLabs === 'undefined' ? [] : RetainingLabs.map(lab=>lab.key==='excavation'?createExcavationLab(lab):lab)),
 ...(typeof PileLabs === 'undefined' ? [] : PileLabs),
 ...(typeof SlopeLabs === 'undefined' ? [] : SlopeLabs),
 ...(typeof ImprovementLabs === 'undefined' ? [] : ImprovementLabs),
 ...(typeof DynamicsLabs === 'undefined' ? [] : DynamicsLabs),
 ...(typeof LayeredCaseLabs === 'undefined' ? [] : LayeredCaseLabs),
 ...(typeof InvestigationLabs === 'undefined' ? [] : InvestigationLabs),
 ...(typeof PileLateralLabs === 'undefined' ? [] : PileLateralLabs),
 ...(typeof SoilResponseLabs === 'undefined' ? [] : SoilResponseLabs),
 ...(typeof FoundationCompatibilityLabs === 'undefined' ? [] : FoundationCompatibilityLabs),
 ...(typeof CompositeGroundLabs === 'undefined' ? [] : CompositeGroundLabs),
 ...(typeof CyclicEvidenceLabs === 'undefined' ? [] : CyclicEvidenceLabs),
 ...(typeof DrainedEvidenceLabs === 'undefined' ? [] : DrainedEvidenceLabs),
 ...(typeof ReinforcementLabs === 'undefined' ? [] : ReinforcementLabs),
];
const labRegistry=Object.fromEntries(ExtensionLabs.map(lab=>[lab.key,lab]));
if(Object.keys(labRegistry).length!==ExtensionLabs.length)throw new Error('Duplicate experiment key');
