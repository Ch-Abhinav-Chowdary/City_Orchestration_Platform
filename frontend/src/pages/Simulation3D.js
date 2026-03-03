import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky, Stars, Float, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { getIncident } from '../services/api';
import './Simulation3D.css';

// ─── Realistic Building with windows and rooftop details ────────────────────
function RealisticBuilding({ position, floors, width = 2, depth = 2, isHighlighted, buildingType = 'office' }) {
    const groupRef = useRef();
    const windowsRef = useRef([]);
    const floorHeight = 3;
    const totalHeight = floors * floorHeight;

    // Deterministic seed from position for consistent randomness
    const seed = Math.abs(position[0] * 7 + position[2] * 13);
    const buildingColor = isHighlighted
        ? '#1e3a5f'
        : ['#1a1f2e', '#1f2233', '#252838', '#1c2030', '#22263a'][Math.floor(seed) % 5];

    const roofColor = ['#2a3040', '#333a4d', '#2e3445'][Math.floor(seed) % 3];
    const windowTint = ['#fbbf24', '#fef3c7', '#93c5fd', '#c4b5fd', '#a5f3fc'][Math.floor(seed * 1.7) % 5];

    useFrame((state) => {
        if (isHighlighted && groupRef.current) {
            const pulse = 0.15 + Math.sin(state.clock.elapsedTime * 2.5) * 0.08;
            groupRef.current.children.forEach(child => {
                if (child.material && child.material.emissiveIntensity !== undefined && !child.userData.isWindow) {
                    child.material.emissiveIntensity = pulse;
                }
            });
        }
    });

    const windows = useMemo(() => {
        const wins = [];
        const cols = Math.max(2, Math.floor(width / 0.8));
        const rows = floors;
        for (let floor = 0; floor < rows; floor++) {
            for (let col = 0; col < cols; col++) {
                const isLit = Math.random() > 0.35;
                const x = -width / 2 + 0.4 + col * ((width - 0.6) / (cols - 1 || 1));
                const y = floor * floorHeight + floorHeight * 0.5;
                // Front face only for performance
                wins.push({
                    pos: [x, y, depth / 2 + 0.01],
                    lit: isLit,
                    face: 'front'
                });
            }
        }
        return wins;
    }, [width, depth, floors, floorHeight]);

    return (
        <group position={position} ref={groupRef}>
            {/* Main building body */}
            <mesh position={[0, totalHeight / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, totalHeight, depth]} />
                <meshStandardMaterial
                    color={buildingColor}
                    roughness={0.75}
                    metalness={0.25}
                    emissive={isHighlighted ? '#1e40af' : '#000000'}
                    emissiveIntensity={isHighlighted ? 0.15 : 0}
                />
            </mesh>

            {/* Roof ledge */}
            <mesh position={[0, totalHeight + 0.15, 0]}>
                <boxGeometry args={[width + 0.3, 0.3, depth + 0.3]} />
                <meshStandardMaterial color={roofColor} roughness={0.8} metalness={0.2} />
            </mesh>

            {/* Rooftop AC unit for taller buildings */}
            {floors > 4 && (
                <mesh position={[width * 0.2, totalHeight + 0.6, depth * 0.15]}>
                    <boxGeometry args={[0.5, 0.4, 0.5]} />
                    <meshStandardMaterial color="#404858" roughness={0.9} metalness={0.5} />
                </mesh>
            )}

            {/* Windows - front face only */}
            {windows.map((w, i) => {
                const litColor = w.lit ? windowTint : '#0a0e17';
                return (
                    <mesh key={i} position={w.pos}>
                        <planeGeometry args={[0.35, 0.5]} />
                        <meshStandardMaterial
                            color={litColor}
                            emissive={w.lit ? litColor : '#000000'}
                            emissiveIntensity={w.lit ? 0.5 : 0}
                            transparent
                            opacity={w.lit ? 0.9 : 0.3}
                        />
                    </mesh>
                );
            })}

            {/* Warm interior glow for highlighted buildings */}
            {isHighlighted && (
                <pointLight position={[0, totalHeight * 0.5, 0]} intensity={0.5} color="#ff8844" distance={totalHeight * 0.8} decay={2} />
            )}
        </group>
    );
}

// ─── Animated Resource Vehicle ──────────────────────────────────────────────
function AnimatedResource({ position, targetPosition, type, delay = 0, label }) {
    const groupRef = useRef();
    const lightRef = useRef();
    const [progress, setProgress] = useState(0);

    useFrame((state, delta) => {
        if (progress < 1) {
            setProgress(Math.min(progress + delta * 0.25, 1));
        }

        if (groupRef.current) {
            const t = Math.max(Math.min((progress - delay) / (1 - delay), 1), 0);
            if (t > 0) {
                // Smooth ease curve
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                groupRef.current.position.x = position[0] + (targetPosition[0] - position[0]) * eased;
                groupRef.current.position.y = position[1] + (targetPosition[1] - position[1]) * eased + Math.sin(eased * Math.PI) * 1.5;
                groupRef.current.position.z = position[2] + (targetPosition[2] - position[2]) * eased;

                // Face direction of travel
                const dx = targetPosition[0] - position[0];
                const dz = targetPosition[2] - position[2];
                groupRef.current.rotation.y = Math.atan2(dx, dz);
            }
        }

        // Flashing emergency light
        if (lightRef.current) {
            lightRef.current.intensity = 1.5 + Math.sin(state.clock.elapsedTime * 12) * 1.5;
        }
    });

    const colors = {
        fire: { body: '#b91c1c', accent: '#ef4444', light: '#ff3333' },
        medical: { body: '#f0f0f0', accent: '#16a34a', light: '#22ff44' },
        police: { body: '#1e3a5f', accent: '#3b82f6', light: '#4488ff' }
    };
    const c = colors[type] || colors.fire;

    return (
        <group ref={groupRef} position={position}>
            {/* Vehicle body */}
            <mesh castShadow>
                <boxGeometry args={[0.6, 0.4, 1.2]} />
                <meshStandardMaterial color={c.body} roughness={0.4} metalness={0.6} />
            </mesh>
            {/* Cab */}
            <mesh position={[0, 0.3, 0.15]} castShadow>
                <boxGeometry args={[0.5, 0.25, 0.6]} />
                <meshStandardMaterial color={c.body} roughness={0.3} metalness={0.5} />
            </mesh>
            {/* Emergency light bar */}
            <mesh position={[0, 0.5, 0.15]}>
                <boxGeometry args={[0.4, 0.1, 0.15]} />
                <meshStandardMaterial
                    color={c.accent}
                    emissive={c.accent}
                    emissiveIntensity={1.5}
                />
            </mesh>
            {/* Flashing point light */}
            <pointLight
                ref={lightRef}
                position={[0, 0.7, 0]}
                color={c.light}
                intensity={2}
                distance={8}
            />
            {/* Wheels */}
            {[[-0.3, -0.2, 0.35], [0.3, -0.2, 0.35], [-0.3, -0.2, -0.35], [0.3, -0.2, -0.35]].map((pos, i) => (
                <mesh key={i} position={pos} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
                    <meshStandardMaterial color="#111111" roughness={0.9} />
                </mesh>
            ))}
            {/* Label */}
            {label && (
                <Html position={[0, 1.2, 0]} center distanceFactor={15}>
                    <div className="resource-label-3d" style={{
                        background: 'rgba(0,0,0,0.8)',
                        color: c.accent,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        border: `1px solid ${c.accent}40`
                    }}>{label}</div>
                </Html>
            )}
        </group>
    );
}

// ─── Realistic Fire Simulation ──────────────────────────────────────────────
function RealisticFire({ center, severity, time }) {
    const coreRef = useRef();
    const outerRef = useRef();
    const smokeRef = useRef();
    const sparksRef = useRef();
    const flameRef = useRef();

    const baseRadius = 2.5 + severity * 1.2;
    const spreadRadius = baseRadius * (1 + time * 0.08);
    const fireIntensity = Math.min(1, time * 0.15);

    // Smoke particles - optimized count
    const smokeParticles = useMemo(() => {
        const particles = [];
        for (let i = 0; i < 18; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * spreadRadius * 0.9;
            particles.push({
                x: Math.cos(angle) * r,
                z: Math.sin(angle) * r,
                speed: 0.3 + Math.random() * 1.2,
                size: 0.5 + Math.random() * 0.9,
                phase: Math.random() * Math.PI * 2,
                drift: (Math.random() - 0.5) * 0.3
            });
        }
        return particles;
    }, [spreadRadius]);

    // Spark/ember particles - optimized count
    const sparkParticles = useMemo(() => {
        const particles = [];
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * spreadRadius * 0.7;
            particles.push({
                x: Math.cos(angle) * r,
                z: Math.sin(angle) * r,
                speed: 1.5 + Math.random() * 4,
                phase: Math.random() * Math.PI * 2,
                size: 0.04 + Math.random() * 0.08,
                drift: (Math.random() - 0.5) * 0.5
            });
        }
        return particles;
    }, [spreadRadius]);

    // Flame columns - optimized count
    const flameColumns = useMemo(() => {
        const flames = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * spreadRadius * 0.4;
            flames.push({
                x: Math.cos(angle) * r,
                z: Math.sin(angle) * r,
                height: 1.0 + Math.random() * 2.5,
                width: 0.25 + Math.random() * 0.4,
                speed: 2 + Math.random() * 4,
                phase: Math.random() * Math.PI * 2
            });
        }
        return flames;
    }, [spreadRadius]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;

        // Pulsing fire core
        if (coreRef.current) {
            const s = 1 + Math.sin(t * 3) * 0.08 + Math.sin(t * 7) * 0.04;
            coreRef.current.scale.set(s, 1, s);
            coreRef.current.material.opacity = 0.35 + Math.sin(t * 4) * 0.1;
        }

        // Outer glow oscillation
        if (outerRef.current) {
            const s = 1 + Math.sin(t * 1.5) * 0.05;
            outerRef.current.scale.set(s, 1, s);
        }

        // Animate smoke with drift
        if (smokeRef.current) {
            smokeRef.current.children.forEach((child, i) => {
                const p = smokeParticles[i];
                if (p) {
                    const y = ((t * p.speed + p.phase) % 8);
                    child.position.y = y;
                    child.position.x = p.x + Math.sin(t * 0.5 + p.phase) * p.drift * y;
                    child.material.opacity = Math.max(0, 0.3 - y * 0.035);
                    child.scale.setScalar(p.size + y * 0.2);
                }
            });
        }

        // Animate sparks with wind drift
        if (sparksRef.current) {
            sparksRef.current.children.forEach((child, i) => {
                const p = sparkParticles[i];
                if (p) {
                    const y = ((t * p.speed + p.phase) % 5);
                    child.position.y = y;
                    child.position.x = p.x + Math.sin(t + p.phase) * p.drift * y;
                    child.material.opacity = y < 3 ? 1 : Math.max(0, 1 - (y - 3) * 0.5);
                }
            });
        }

        // Animate flame columns
        if (flameRef.current) {
            flameRef.current.children.forEach((child, i) => {
                const f = flameColumns[i];
                if (f) {
                    const scaleY = 0.5 + Math.abs(Math.sin(t * f.speed + f.phase)) * 1.0;
                    child.scale.y = scaleY;
                }
            });
        }
    });

    return (
        <group position={center}>
            {/* Inner fire zone - hot core */}
            <mesh ref={coreRef} position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[spreadRadius * 0.5, 24]} />
                <meshStandardMaterial
                    color="#ff4500"
                    transparent
                    opacity={0.45}
                    emissive="#ff4500"
                    emissiveIntensity={2.0}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Outer spread zone */}
            <mesh ref={outerRef} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[spreadRadius * 0.45, spreadRadius, 24]} />
                <meshStandardMaterial
                    color="#dc2626"
                    transparent
                    opacity={0.25}
                    emissive="#dc2626"
                    emissiveIntensity={0.8}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Danger perimeter ring */}
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[spreadRadius - 0.1, spreadRadius + 0.1, 32]} />
                <meshStandardMaterial
                    color="#fbbf24"
                    transparent
                    opacity={0.5}
                    emissive="#fbbf24"
                    emissiveIntensity={0.4}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Volumetric flame columns */}
            <group ref={flameRef}>
                {flameColumns.map((f, i) => (
                    <mesh key={`flame-${i}`} position={[f.x, f.height * 0.5, f.z]}>
                        <coneGeometry args={[f.width, f.height, 5]} />
                        <meshStandardMaterial
                            color={i % 2 === 0 ? '#ff6600' : '#ffaa00'}
                            emissive={i % 2 === 0 ? '#ff4400' : '#ff8800'}
                            emissiveIntensity={2.5}
                            transparent
                            opacity={0.4}
                            depthWrite={false}
                        />
                    </mesh>
                ))}
            </group>

            {/* Smoke columns */}
            <group ref={smokeRef}>
                {smokeParticles.map((p, i) => (
                    <mesh key={i} position={[p.x, 0, p.z]}>
                        <sphereGeometry args={[p.size, 5, 5]} />
                        <meshStandardMaterial
                            color="#333"
                            transparent
                            opacity={0.25}
                            depthWrite={false}
                        />
                    </mesh>
                ))}
            </group>

            {/* Flying embers/sparks */}
            <group ref={sparksRef}>
                {sparkParticles.map((p, i) => (
                    <mesh key={i} position={[p.x, 0, p.z]}>
                        <sphereGeometry args={[p.size, 4, 4]} />
                        <meshStandardMaterial
                            color="#ffa500"
                            emissive="#ff6600"
                            emissiveIntensity={2}
                            transparent
                            opacity={1}
                        />
                    </mesh>
                ))}
            </group>

            {/* Fire lighting - reduced to 3 lights */}
            <pointLight position={[0, 4, 0]} intensity={5 + fireIntensity * 3} color="#ff6600" distance={spreadRadius * 3} decay={2} />
            <pointLight position={[spreadRadius * 0.3, 1, spreadRadius * 0.3]} intensity={3} color="#ff3300" distance={spreadRadius * 1.5} />
            <pointLight position={[-spreadRadius * 0.3, 1, -spreadRadius * 0.3]} intensity={3} color="#ffaa00" distance={spreadRadius * 1.5} />
        </group>
    );
}

// ─── Pulsing Incident Marker ────────────────────────────────────────────────
function IncidentMarker({ type, severity }) {
    const ringRef = useRef();
    const beamRef = useRef();

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (ringRef.current) {
            ringRef.current.rotation.y = t * 0.5;
            const s = 1 + Math.sin(t * 2) * 0.15;
            ringRef.current.scale.set(s, 1, s);
        }
        if (beamRef.current) {
            beamRef.current.material.opacity = 0.3 + Math.sin(t * 3) * 0.15;
        }
    });

    const markerColor = type === 'fire' ? '#dc2626'
        : type === 'medical' ? '#16a34a'
            : type === 'hazmat' ? '#f59e0b'
                : '#3b82f6';

    return (
        <group position={[0, 0, 0]}>
            {/* Vertical beam */}
            <mesh ref={beamRef} position={[0, 10, 0]}>
                <cylinderGeometry args={[0.08, 0.3, 20, 16]} />
                <meshStandardMaterial
                    color={markerColor}
                    emissive={markerColor}
                    emissiveIntensity={1}
                    transparent
                    opacity={0.4}
                />
            </mesh>

            {/* Rotating ring at base */}
            <mesh ref={ringRef} position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.5, 1.8, 32]} />
                <meshStandardMaterial
                    color={markerColor}
                    emissive={markerColor}
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.7}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Floating label */}
            <Float speed={2} floatIntensity={0.3}>
                <Html position={[0, 22, 0]} center distanceFactor={20}>
                    <div style={{
                        background: `${markerColor}dd`,
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        boxShadow: `0 0 20px ${markerColor}66`
                    }}>
                        ⚠ {type.toUpperCase()} • SEV {severity}
                    </div>
                </Html>
            </Float>

            {/* Ground glow */}
            <pointLight position={[0, 1, 0]} intensity={4} color={markerColor} distance={12} decay={2} />
        </group>
    );
}

// ─── Road Network ───────────────────────────────────────────────────────────
function Roads() {
    const roadColor = '#1a1e28';
    const lineColor = '#fbbf24';
    const sidewalkColor = '#1e222e';
    const crosswalkColor = '#cccccc';

    return (
        <group>
            {/* Main roads with sidewalks */}
            {[-12, 0, 12].map((x, i) => (
                <group key={`road-h-${i}`}>
                    {/* Road surface */}
                    <mesh position={[x, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[2.8, 50]} />
                        <meshStandardMaterial color={roadColor} roughness={0.92} metalness={0.05} />
                    </mesh>
                    {/* Sidewalks - slightly raised */}
                    <mesh position={[x - 1.65, -0.42, 0]}>
                        <boxGeometry args={[0.5, 0.12, 50]} />
                        <meshStandardMaterial color={sidewalkColor} roughness={0.85} />
                    </mesh>
                    <mesh position={[x + 1.65, -0.42, 0]}>
                        <boxGeometry args={[0.5, 0.12, 50]} />
                        <meshStandardMaterial color={sidewalkColor} roughness={0.85} />
                    </mesh>
                    {/* Center dashed line */}
                    {Array.from({ length: 10 }).map((_, j) => (
                        <mesh key={j} position={[x, -0.47, -22.5 + j * 5]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[0.08, 2]} />
                            <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.3} />
                        </mesh>
                    ))}
                    {/* Edge lines */}
                    <mesh position={[x - 1.2, -0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, 50]} />
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.15} transparent opacity={0.4} />
                    </mesh>
                    <mesh position={[x + 1.2, -0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[0.05, 50]} />
                        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.15} transparent opacity={0.4} />
                    </mesh>
                </group>
            ))}
            {[-12, 0, 12].map((z, i) => (
                <group key={`road-v-${i}`}>
                    <mesh position={[0, -0.48, z]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[50, 2.8]} />
                        <meshStandardMaterial color={roadColor} roughness={0.92} metalness={0.05} />
                    </mesh>
                    {/* Sidewalks */}
                    <mesh position={[0, -0.42, z - 1.65]}>
                        <boxGeometry args={[50, 0.12, 0.5]} />
                        <meshStandardMaterial color={sidewalkColor} roughness={0.85} />
                    </mesh>
                    <mesh position={[0, -0.42, z + 1.65]}>
                        <boxGeometry args={[50, 0.12, 0.5]} />
                        <meshStandardMaterial color={sidewalkColor} roughness={0.85} />
                    </mesh>
                    {Array.from({ length: 10 }).map((_, j) => (
                        <mesh key={j} position={[-22.5 + j * 5, -0.47, z]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[2, 0.08]} />
                            <meshStandardMaterial color={lineColor} emissive={lineColor} emissiveIntensity={0.3} />
                        </mesh>
                    ))}
                </group>
            ))}
            {/* Crosswalks at major intersections */}
            {[-12, 0, 12].map((x, xi) =>
                [-12, 0, 12].map((z, zi) => (
                    <group key={`crosswalk-${xi}-${zi}`}>
                        {Array.from({ length: 5 }).map((_, k) => (
                            <mesh key={k} position={[x + 1.8, -0.465, z - 0.8 + k * 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
                                <planeGeometry args={[0.6, 0.15]} />
                                <meshStandardMaterial color={crosswalkColor} emissive={crosswalkColor} emissiveIntensity={0.1} transparent opacity={0.6} />
                            </mesh>
                        ))}
                    </group>
                ))
            )}
        </group>
    );
}

// ─── Street Lights ──────────────────────────────────────────────────────────
function StreetLights() {
    const positions = useMemo(() => {
        const pts = [];
        for (let x = -20; x <= 20; x += 12) {
            for (let z = -20; z <= 20; z += 12) {
                pts.push([x + 1.5, 0, z + 1.5]);
            }
        }
        return pts;
    }, []);

    return (
        <group>
            {positions.map((pos, i) => (
                <group key={i} position={pos}>
                    <mesh position={[0, 2.5, 0]}>
                        <cylinderGeometry args={[0.04, 0.06, 5, 8]} />
                        <meshStandardMaterial color="#555566" metalness={0.8} roughness={0.3} />
                    </mesh>
                    <mesh position={[0.3, 4.9, 0]}>
                        <sphereGeometry args={[0.15, 8, 8]} />
                        <meshStandardMaterial
                            color="#fef3c7"
                            emissive="#fef3c7"
                            emissiveIntensity={0.8}
                        />
                    </mesh>
                    <pointLight position={[0.3, 4.5, 0]} intensity={0.4} color="#fef3c7" distance={6} decay={2} />
                </group>
            ))}
        </group>
    );
}

// ─── Timeline Event Definitions ─────────────────────────────────────────────
const TIMELINE_EVENTS = [
    { time: 0.0, label: 'Incident Reported', icon: '🚨', color: '#dc2626', position: [0, 24, 0], type: 'critical' },
    { time: 0.5, label: 'Dispatch Notified', icon: '📡', color: '#f59e0b', position: [2, 20, 2], type: 'info' },
    { time: 1.5, label: 'Engine 1 Dispatched', icon: '🚒', color: '#ef4444', position: [-16, 8, -13], type: 'dispatch' },
    { time: 2.0, label: 'Ladder 2 Dispatched', icon: '🚒', color: '#ef4444', position: [16, 8, -13], type: 'dispatch' },
    { time: 3.0, label: 'Medic 1 Dispatched', icon: '🚑', color: '#16a34a', position: [-16, 8, 13], type: 'dispatch' },
    { time: 4.0, label: 'Unit 7 Dispatched', icon: '🚔', color: '#3b82f6', position: [16, 8, 13], type: 'dispatch' },
    { time: 6.0, label: 'Perimeter Established', icon: '🔶', color: '#f59e0b', position: [0, 10, 8], type: 'action' },
    { time: 8.0, label: 'Engine 1 On Scene', icon: '✅', color: '#16a34a', position: [-1.5, 5, -1.5], type: 'arrival' },
    { time: 10.0, label: 'Ladder 2 On Scene', icon: '✅', color: '#16a34a', position: [1.5, 5, -1.5], type: 'arrival' },
    { time: 12.0, label: 'Fire Suppression Begins', icon: '💧', color: '#06b6d4', position: [0, 14, 0], type: 'action' },
    { time: 18.0, label: 'Fire 60% Contained', icon: '📊', color: '#f59e0b', position: [0, 16, 0], type: 'progress' },
    { time: 24.0, label: 'Fire Fully Contained', icon: '✅', color: '#16a34a', position: [0, 18, 0], type: 'progress' },
    { time: 28.0, label: 'All Clear — Scene Secured', icon: '🏁', color: '#22d3ee', position: [0, 22, 0], type: 'resolved' },
];

// ─── Floating Timeline Event Marker (3D) ────────────────────────────────────
function TimelineEventMarker({ event, simulationTime }) {
    const groupRef = useRef();
    const elapsed = simulationTime - event.time;

    // Fade in over 1 minute of sim time, stays visible
    const opacity = Math.min(elapsed / 1, 1);

    // Gently float up after appearing
    const yOffset = Math.min(elapsed * 0.3, 2);

    useFrame((state) => {
        if (groupRef.current) {
            // Subtle bobbing
            groupRef.current.position.y = event.position[1] + yOffset + Math.sin(state.clock.elapsedTime * 1.5 + event.time) * 0.2;
        }
    });

    if (elapsed < 0) return null;

    const isCritical = event.type === 'critical' || event.type === 'resolved';
    const isRecent = elapsed < 3; // Highlight events that just happened

    return (
        <group ref={groupRef} position={[event.position[0], event.position[1], event.position[2]]}>
            {/* Connecting line to ground */}
            <mesh position={[0, -event.position[1] / 2, 0]}>
                <cylinderGeometry args={[0.015, 0.015, event.position[1], 4]} />
                <meshStandardMaterial
                    color={event.color}
                    transparent
                    opacity={opacity * 0.25}
                />
            </mesh>

            {/* Ground dot */}
            <mesh position={[0, -event.position[1] + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.3, 16]} />
                <meshStandardMaterial
                    color={event.color}
                    emissive={event.color}
                    emissiveIntensity={isRecent ? 1.2 : 0.4}
                    transparent
                    opacity={opacity * 0.6}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Floating HTML label */}
            <Html center distanceFactor={18} style={{ opacity, transition: 'opacity 0.3s' }}>
                <div className={`timeline-event-3d ${isCritical ? 'critical' : ''} ${isRecent ? 'recent' : ''}`} style={{
                    background: `linear-gradient(135deg, ${event.color}22, ${event.color}11)`,
                    border: `1px solid ${event.color}${isRecent ? '99' : '44'}`,
                    color: event.color,
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: isRecent ? `0 0 12px ${event.color}44` : 'none',
                    animation: isRecent ? 'eventPulse 1.5s ease-in-out infinite' : 'none'
                }}>
                    <span>{event.icon}</span>
                    <span>{event.label}</span>
                    <span style={{ opacity: 0.5, fontSize: '9px', marginLeft: '4px' }}>
                        {event.time.toFixed(0)}m
                    </span>
                </div>
            </Html>

            {/* Glow light for recent events */}
            {isRecent && (
                <pointLight
                    position={[0, 0, 0]}
                    color={event.color}
                    intensity={1.5}
                    distance={6}
                    decay={2}
                />
            )}
        </group>
    );
}

// ─── Main City Scene ────────────────────────────────────────────────────────
function CityScene({ incident, simulationTime, showResources, showFireSpread, showEvents = true }) {
    // Generate deterministic building layout on city blocks
    const buildings = useMemo(() => {
        const bldgs = [];
        const rng = (seed) => {
            let s = seed;
            return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
        };
        const rand = rng(42);

        // Place buildings in grid blocks (avoiding roads at x: -12, 0, 12 and z: -12, 0, 12)
        const blocks = [];
        for (let bx = -2; bx <= 2; bx++) {
            for (let bz = -2; bz <= 2; bz++) {
                blocks.push({ bx, bz });
            }
        }

        blocks.forEach(({ bx, bz }) => {
            const centerX = bx * 12;
            const centerZ = bz * 12;
            const numBuildings = 2 + Math.floor(rand() * 3);

            for (let i = 0; i < numBuildings; i++) {
                const ox = (rand() - 0.5) * 7;
                const oz = (rand() - 0.5) * 7;
                const x = centerX + ox;
                const z = centerZ + oz;

                // Skip if too close to center road
                if (Math.abs(x) < 2 || Math.abs(z) < 2) continue;
                if (Math.abs(x - 12) < 2 || Math.abs(z - 12) < 2) continue;
                if (Math.abs(x + 12) < 2 || Math.abs(z + 12) < 2) continue;

                const floors = 2 + Math.floor(rand() * 7);
                const width = 1.5 + rand() * 2;
                const depth = 1.5 + rand() * 2;
                const distanceToIncident = Math.sqrt(x * x + z * z);

                bldgs.push({
                    position: [x, 0, z],
                    floors,
                    width,
                    depth,
                    isHighlighted: distanceToIncident < 8
                });
            }
        });

        return bldgs;
    }, []);

    return (
        <>
            {/* Atmospheric sky */}
            <Sky
                distance={450000}
                sunPosition={[5, 0.2, -10]}
                inclination={0.02}
                azimuth={0.25}
                mieCoefficient={0.005}
                mieDirectionalG={0.99}
                rayleigh={3}
                turbidity={8}
            />
            <Stars radius={120} depth={60} count={2000} factor={4} fade speed={0.8} />

            {/* Fog for depth - pushed further for more visible detail */}
            <fog attach="fog" args={['#0a0e17', 35, 90]} />

            {/* Realistic Lighting */}
            <ambientLight intensity={0.12} color="#b0c4de" />
            <directionalLight
                position={[30, 40, 20]}
                intensity={0.5}
                color="#e8e0d0"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={80}
                shadow-camera-left={-35}
                shadow-camera-right={35}
                shadow-camera-top={35}
                shadow-camera-bottom={-35}
                shadow-bias={-0.0001}
            />
            {/* Moonlight - cool blue fill */}
            <directionalLight position={[-20, 30, -15]} intensity={0.2} color="#4488cc" />
            {/* Warm city ambient from below */}
            <hemisphereLight skyColor="#1a2040" groundColor="#1a1520" intensity={0.25} />

            {/* Ground */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
                <planeGeometry args={[120, 120]} />
                <meshStandardMaterial color="#111622" roughness={0.95} metalness={0.1} />
            </mesh>

            {/* Road network */}
            <Roads />

            {/* Street lights */}
            <StreetLights />

            {/* Trees along sidewalks */}
            {useMemo(() => {
                const trees = [];
                const treeRng = (s) => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
                let seed = 123;
                // Place trees near roads but not on them
                const treePositions = [];
                for (let x = -22; x <= 22; x += 5) {
                    for (let z = -22; z <= 22; z += 5) {
                        // Only place near roads (within 3-5 units of road line)
                        const nearRoad = [-12, 0, 12].some(r => (Math.abs(x - r) > 2.5 && Math.abs(x - r) < 4.5) || (Math.abs(z - r) > 2.5 && Math.abs(z - r) < 4.5));
                        if (!nearRoad) continue;
                        // Don't place on roads
                        const onRoad = [-12, 0, 12].some(r => Math.abs(x - r) < 2 || Math.abs(z - r) < 2);
                        if (onRoad) continue;
                        seed = (seed * 16807) % 2147483647;
                        if (treeRng(seed) > 0.5) continue; // Random skip for natural feel
                        treePositions.push([x, z]);
                    }
                }
                return treePositions.map(([tx, tz], i) => {
                    const treeHeight = 2 + (i % 3) * 0.5;
                    return (
                        <group key={`tree-${i}`} position={[tx, -0.5, tz]}>
                            {/* Trunk */}
                            <mesh position={[0, treeHeight * 0.3, 0]}>
                                <cylinderGeometry args={[0.06, 0.1, treeHeight * 0.4, 4]} />
                                <meshStandardMaterial color="#3a2820" roughness={0.9} />
                            </mesh>
                            {/* Canopy */}
                            <mesh position={[0, treeHeight * 0.7, 0]}>
                                <coneGeometry args={[0.6, treeHeight * 0.55, 5]} />
                                <meshStandardMaterial color="#1a3a1a" roughness={0.85} />
                            </mesh>
                        </group>
                    );
                });
            }, [])}

            {/* City buildings */}
            {buildings.map((b, i) => (
                <RealisticBuilding
                    key={i}
                    position={b.position}
                    floors={b.floors}
                    width={b.width}
                    depth={b.depth}
                    isHighlighted={b.isHighlighted}
                />
            ))}

            {/* Incident marker */}
            {incident && (
                <IncidentMarker type={incident.type} severity={incident.severity} />
            )}

            {/* Fire spread */}
            {showFireSpread && incident && incident.type === 'fire' && (
                <RealisticFire
                    center={[0, 0, 0]}
                    severity={incident.severity}
                    time={simulationTime}
                />
            )}

            {/* Resource vehicles */}
            {showResources && incident && (
                <>
                    <AnimatedResource
                        position={[-18, 0, -15]}
                        targetPosition={[-1.5, 0, -1.5]}
                        type="fire"
                        delay={0}
                        label="Engine 1"
                    />
                    <AnimatedResource
                        position={[18, 0, -15]}
                        targetPosition={[1.5, 0, -1.5]}
                        type="fire"
                        delay={0.15}
                        label="Ladder 2"
                    />
                    <AnimatedResource
                        position={[-18, 0, 15]}
                        targetPosition={[-1.5, 0, 1.5]}
                        type="medical"
                        delay={0.3}
                        label="Medic 1"
                    />
                    <AnimatedResource
                        position={[18, 0, 15]}
                        targetPosition={[1.5, 0, 1.5]}
                        type="police"
                        delay={0.45}
                        label="Unit 7"
                    />
                </>
            )}

            {/* Timeline event markers */}
            {showEvents && TIMELINE_EVENTS.map((event, i) => (
                <TimelineEventMarker
                    key={i}
                    event={event}
                    simulationTime={simulationTime}
                />
            ))}
        </>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
const Simulation3D = () => {
    const { id } = useParams();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);
    const [simulationTime, setSimulationTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showResources, setShowResources] = useState(true);
    const [showFireSpread, setShowFireSpread] = useState(true);
    const [showEvents, setShowEvents] = useState(true);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    useEffect(() => {
        loadIncident();
    }, [id]);

    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                setSimulationTime((t) => {
                    const next = t + 0.5 * playbackSpeed;
                    if (next >= 30) {
                        setIsPlaying(false);
                        return 30;
                    }
                    return next;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isPlaying, playbackSpeed]);

    const loadIncident = async () => {
        try {
            const response = await getIncident(id);
            setIncident(response.data.incident);
            setLoading(false);
        } catch (error) {
            console.error('Error loading incident:', error);
            setLoading(false);
        }
    };

    const resetSimulation = () => {
        setSimulationTime(0);
        setIsPlaying(false);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Initializing 3D Simulation Engine...</p>
            </div>
        );
    }

    if (!incident) {
        return (
            <div className="error-container">
                <h3 className="error-title">Incident Not Found</h3>
                <Link to="/" className="btn btn-primary">Return to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="simulation-3d fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">3D Incident Simulation</h1>
                    <p className="page-subtitle">
                        {incident.type.toUpperCase()} — Severity {incident.severity} — {incident.location?.address || 'Unknown Location'}
                    </p>
                </div>
                <div>
                    <Link to={`/incident/${incident.incidentId}`} className="btn btn-secondary">← Back to Incident</Link>
                </div>
            </div>

            <div className="simulation-container card">
                <div className="simulation-canvas">
                    <Canvas
                        camera={{ position: [25, 22, 25], fov: 50 }}
                        shadows
                        gl={{
                            antialias: true,
                            toneMapping: THREE.ACESFilmicToneMapping,
                            toneMappingExposure: 0.9,
                            logarithmicDepthBuffer: true
                        }}
                        dpr={[1, 2]}
                    >
                        <CityScene
                            incident={incident}
                            simulationTime={simulationTime}
                            showResources={showResources}
                            showFireSpread={showFireSpread}
                            showEvents={showEvents}
                        />
                        <OrbitControls
                            enablePan={true}
                            enableZoom={true}
                            enableRotate={true}
                            minDistance={8}
                            maxDistance={70}
                            maxPolarAngle={Math.PI / 2.1}
                            enableDamping={true}
                            dampingFactor={0.05}
                            rotateSpeed={0.5}
                        />
                    </Canvas>
                </div>

                <div className="simulation-controls">
                    <div className="control-section timeline-section">
                        <h4>⏱ Timeline Playback</h4>
                        <div className="timeline-controls">
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => setIsPlaying(!isPlaying)}
                            >
                                {isPlaying ? '⏸ Pause' : '▶ Play'}
                            </button>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={resetSimulation}
                            >
                                ⏮ Reset
                            </button>
                            <select
                                className="speed-select"
                                value={playbackSpeed}
                                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                            >
                                <option value={0.5}>0.5×</option>
                                <option value={1}>1×</option>
                                <option value={2}>2×</option>
                                <option value={4}>4×</option>
                            </select>
                        </div>
                        <div className="timeline-slider">
                            <input
                                type="range"
                                min="0"
                                max="30"
                                step="0.5"
                                value={simulationTime}
                                onChange={(e) => setSimulationTime(parseFloat(e.target.value))}
                                className="slider"
                            />
                            <span className="timeline-label">Time: {simulationTime.toFixed(1)} min</span>
                        </div>

                        {/* Event markers on slider track */}
                        <div className="timeline-event-markers">
                            {TIMELINE_EVENTS.map((evt, i) => (
                                <div
                                    key={i}
                                    className={`timeline-tick ${simulationTime >= evt.time ? 'active' : ''} ${Math.abs(simulationTime - evt.time) < 1 ? 'current' : ''}`}
                                    style={{ left: `${(evt.time / 30) * 100}%` }}
                                    title={`${evt.time}m — ${evt.label}`}
                                >
                                    <div className="tick-dot" style={{ background: simulationTime >= evt.time ? evt.color : '#475569' }} />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="control-section">
                        <h4>👁 View Options</h4>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={showResources}
                                onChange={(e) => setShowResources(e.target.checked)}
                            />
                            <span>Show Resource Vehicles</span>
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={showFireSpread}
                                onChange={(e) => setShowFireSpread(e.target.checked)}
                            />
                            <span>Show Fire Spread</span>
                        </label>
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={showEvents}
                                onChange={(e) => setShowEvents(e.target.checked)}
                            />
                            <span>Show Event Markers</span>
                        </label>
                    </div>

                    <div className="control-section events-feed">
                        <h4>📋 Event Log</h4>
                        <div className="events-list">
                            {TIMELINE_EVENTS.map((evt, i) => {
                                const isActive = simulationTime >= evt.time;
                                const isCurrent = isActive && (i === TIMELINE_EVENTS.length - 1 || simulationTime < TIMELINE_EVENTS[i + 1].time);
                                return (
                                    <div
                                        key={i}
                                        className={`event-item ${isActive ? 'active' : ''} ${isCurrent ? 'current' : ''}`}
                                        onClick={() => setSimulationTime(evt.time)}
                                    >
                                        <span className="event-time">{evt.time.toFixed(0).padStart(2, '0')}:00</span>
                                        <span className="event-icon">{evt.icon}</span>
                                        <span className="event-label" style={{ color: isActive ? evt.color : '#64748b' }}>
                                            {evt.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="control-section">
                        <h4>🖱 Camera Controls</h4>
                        <p>Left click + drag: Rotate</p>
                        <p>Right click + drag: Pan</p>
                        <p>Scroll: Zoom</p>
                    </div>

                    <div className="control-section">
                        <h4>📋 Legend</h4>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#1f2233' }}></span>
                            <span>City Buildings</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#1e3a5f', boxShadow: '0 0 6px #3b82f6' }}></span>
                            <span>Affected Buildings</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#dc2626', boxShadow: '0 0 6px #dc2626' }}></span>
                            <span>Incident Location</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#b91c1c' }}></span>
                            <span>Fire Engines</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#f0f0f0' }}></span>
                            <span>Medical Units</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#1e3a5f' }}></span>
                            <span>Police Units</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Simulation3D;
