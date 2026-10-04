/* Exact input schema of the first published input-file format. */
const SessionSchemaV1={
  "earth-pressure": {
    "fields": [
      "height",
      "phi",
      "gamma",
      "gammaSat",
      "waterDepth",
      "surcharge",
      "state",
      "ocr",
      "delta",
      "beta"
    ],
    "questions": [
      "pressure",
      "wedge"
    ]
  },
  "pile-axial": {
    "fields": [
      "length",
      "diameter",
      "layerDepth",
      "tau1",
      "tau2",
      "toeStress",
      "modulus",
      "shaft50",
      "toe50",
      "headLoad",
      "groundSettlement",
      "settlementDepth"
    ],
    "questions": [
      "capacity",
      "transfer",
      "downdrag"
    ]
  },
  "layered-settlement": {
    "fields": [
      "pressure",
      "h1",
      "h2",
      "m1",
      "m2",
      "observedMm",
      "toleranceMm"
    ],
    "questions": [
      "contribution",
      "observation"
    ]
  }
};
