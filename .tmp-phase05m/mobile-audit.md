# Mobile visibility audit before production changes

Inspected the actual Phase 05L production preview in isolated Windows Chrome at 390×844, Normal and Lite, dark, P0/P0.5/P0.91. No tree-count/coordinate changes preceded this audit.

Both cherry groups load from the optimized GLB, remain visible, have finite transforms and intersect the actual camera frustum. Normal and Lite use the same cherry asset and two-tree population. The terrain is visible, and the original scale/grounding path succeeds. No mobile-specific asset exclusion or hidden-tree flag explains the symptom.

The configured canopy centers (-11,-20) and (12,-28) are too far to the sides for the portrait camera's narrow horizontal field. At P0.5 the projected left canopy spans approximately x=-201..83, and the right x=333..529, on a 390 CSS px viewport. Only ~29% of either projected canopy width remains. At P0 the visible strips are ~98 and 77 px. Pixel-difference isolation with the original lighting confirms some tree pixels do render, but large parts are clipped or behind the aquarium; they read as dark edge fragments rather than recognizable trees. Fog and night grading reduce contrast, but neither hides the groups entirely. Changing fog/materials is unnecessary and outside scope.

Root cause: unsuitable world-space placement relative to the mobile frustum, compounded by aquarium overlap; not a loading, tree-count, visibility-flag or culling defect. The fix will change world-space tree coordinates/scale using the existing terrain-grounding code and unchanged camera.

Evidence: [Normal raw inspection](baseline/390x844-normal-dark-visibility.json), [Lite raw inspection](baseline/390x844-lite-dark-visibility.json), [P0](baseline/390x844-normal-dark-p0.png), [P0.5](baseline/390x844-normal-dark-p0.5.png).
