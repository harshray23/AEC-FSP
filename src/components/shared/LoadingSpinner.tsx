"use client";

import React from 'react';
import Lottie from "lottie-react";
import { cn } from '@/lib/utils';

const loadingAnimation = {
  "v": "5.5.7",
  "fr": 60,
  "ip": 0,
  "op": 120,
  "w": 100,
  "h": 100,
  "nm": "Spinner",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Outer Ring",
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100, "ix": 11 },
        "r": { "a": 1, "k": [{ "i": { "x": [0.833], "y": [0.833] }, "o": { "x": [0.167], "y": [0.167] }, "t": 0, "s": [0] }, { "t": 120, "s": [720] }], "ix": 10 },
        "p": { "a": 0, "k": [50, 50, 0], "ix": 2 },
        "a": { "a": 0, "k": [0, 0, 0], "ix": 1 },
        "s": { "a": 0, "k": [100, 100, 100], "ix": 6 }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            { "ty": "el", "d": 1, "s": { "a": 0, "k": [80, 80], "ix": 2 }, "p": { "a": 0, "k": [0, 0], "ix": 3 }, "nm": "Ellipse Path 1" },
            { "ty": "st", "c": { "a": 0, "k": [0.118, 0.227, 0.541], "ix": 3 }, "o": { "a": 0, "k": 100, "ix": 4 }, "w": { "a": 0, "k": 8, "ix": 5 }, "lc": 2, "lj": 2, "ml": 4, "d": [{ "n": "d", "nm": "", "v": { "a": 1, "k": [{ "i": { "x": 0.65, "y": 1 }, "o": { "x": 0.35, "y": 0 }, "t": 0, "s": 20 }, { "i": { "x": 0.65, "y": 1 }, "o": { "x": 0.35, "y": 0 }, "t": 29, "s": 100 }, { "i": { "x": 0.65, "y": 0 }, "o": { "x": 0.35, "y": 1 }, "t": 59, "s": 20 }, { "i": { "x": 0.65, "y": 0 }, "o": { "x": 0.35, "y": 1 }, "t": 89, "s": 100 }, { "t": 119, "s": 20 }], "ix": 1 }, "nm": "Dash" }] }
          ],
          "nm": "Shape Group"
        }
      ],
      "ip": 0,
      "op": 300,
      "st": 0,
      "bm": 0
    }
  ]
};

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 120 }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Lottie
        animationData={loadingAnimation}
        loop={true}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
