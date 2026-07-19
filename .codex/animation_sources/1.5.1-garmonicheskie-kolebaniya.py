"""Manim explainer for section 1.5.1: harmonic oscillations.

The scene deliberately avoids the old visual based on three superimposed
time graphs.  A physical spring oscillator stays on screen while four
successive layers explain amplitude and phase, kinematics, dynamics, and
energy.  The phase advances linearly so the angular frequency is constant.
"""

from __future__ import annotations

import numpy as np

from manim import (
    DOWN,
    LEFT,
    PI,
    RIGHT,
    TAU,
    UP,
    WHITE,
    Arrow,
    Circle,
    DashedLine,
    Dot,
    FadeIn,
    FadeOut,
    Line,
    MathTex,
    Rectangle,
    RoundedRectangle,
    Scene,
    Text,
    ValueTracker,
    VGroup,
    VMobject,
    always_redraw,
    config,
    linear,
)


config.background_color = WHITE
config.pixel_width = 1920
config.pixel_height = 1080
config.frame_rate = 30

INK = "#0F172A"
MUTED = "#52606D"
GUIDE = "#94A3B8"
BORDER = "#C8D3E0"
SPRING = "#64748B"
DISP = "#2563EB"
DISP_FILL = "#DBEAFE"
VELOCITY = "#047857"
ACCEL = "#DC2626"
KINETIC = "#0F9F8F"
POTENTIAL = "#D97706"


def make_spring(start_x: float, end_x: float, y: float) -> VMobject:
    """Return a spring with a fixed number of turns and no length jitter."""

    lead = 0.16
    amplitude = 0.13
    turns = 15
    usable = max(end_x - start_x - 2 * lead, 0.25)
    points = [
        np.array([start_x, y, 0.0]),
        np.array([start_x + lead, y, 0.0]),
    ]
    for index in range(1, turns):
        x = start_x + lead + usable * index / turns
        offset = amplitude if index % 2 else -amplitude
        points.append(np.array([x, y + offset, 0.0]))
    points.extend(
        [
            np.array([end_x - lead, y, 0.0]),
            np.array([end_x, y, 0.0]),
        ]
    )
    return VMobject().set_points_as_corners(points).set_stroke(SPRING, 4)


def safe_horizontal_arrow(
    origin: np.ndarray,
    signed_length: float,
    color: str,
    max_opacity_scale: float = 0.14,
) -> Arrow:
    """Create an arrow that remains well-defined when its value is zero."""

    magnitude = abs(signed_length)
    direction = 1.0 if signed_length >= 0 else -1.0
    visible_length = max(magnitude, 0.055)
    arrow = Arrow(
        origin,
        origin + RIGHT * direction * visible_length,
        buff=0,
        color=color,
        stroke_width=6,
        max_tip_length_to_length_ratio=0.18,
    )
    arrow.set_opacity(min(1.0, magnitude / max_opacity_scale))
    return arrow


def legend_item(color: str, formula: str) -> VGroup:
    dot = Dot(radius=0.065, color=color)
    label = MathTex(formula, color=INK).scale(0.56)
    return VGroup(dot, label).arrange(RIGHT, buff=0.12)


class HarmonicOscillation(Scene):
    """One oscillator, four mutually consistent descriptions."""

    def construct(self) -> None:
        phase = ValueTracker(-PI / 2)

        title = Text(
            "Гармонические колебания: одно движение — четыре описания",
            font="Arial",
            font_size=43,
            weight="BOLD",
            color=INK,
        )
        title.scale_to_fit_width(12.9).move_to(np.array([0.0, 3.52, 0.0]))

        divider = Line(
            np.array([0.45, -3.35, 0.0]),
            np.array([0.45, 2.75, 0.0]),
            color=BORDER,
            stroke_width=2.4,
        )

        track_y = 1.00
        wall_x = -6.20
        equilibrium_x = -3.35
        amplitude = 1.55
        block_width = 0.88

        def x_norm() -> float:
            return float(np.sin(phase.get_value()))

        def v_norm() -> float:
            return float(np.cos(phase.get_value()))

        def a_norm() -> float:
            return -x_norm()

        def block_x() -> float:
            return equilibrium_x + amplitude * x_norm()

        oscillator_label = Text(
            "Пружинный осциллятор — модель материальной точки",
            font="Arial",
            font_size=22,
            color=MUTED,
        )
        oscillator_label.scale_to_fit_width(5.45)
        oscillator_label.move_to(np.array([-3.35, 2.62, 0.0]))

        track = Line(
            np.array([wall_x, track_y, 0.0]),
            np.array([-0.62, track_y, 0.0]),
            color=GUIDE,
            stroke_width=3,
        )
        wall = Line(
            np.array([wall_x, track_y - 0.62, 0.0]),
            np.array([wall_x, track_y + 0.62, 0.0]),
            color=INK,
            stroke_width=5,
        )
        wall_hatching = VGroup(
            *[
                Line(
                    np.array([wall_x - 0.26, y - 0.18, 0.0]),
                    np.array([wall_x, y, 0.0]),
                    color=GUIDE,
                    stroke_width=2,
                )
                for y in np.linspace(track_y - 0.50, track_y + 0.50, 6)
            ]
        )
        equilibrium = DashedLine(
            np.array([equilibrium_x, track_y - 0.72, 0.0]),
            np.array([equilibrium_x, track_y + 0.72, 0.0]),
            dash_length=0.10,
            dashed_ratio=0.55,
            color=GUIDE,
            stroke_width=2.5,
        )

        spring = always_redraw(
            lambda: make_spring(
                wall_x,
                block_x() - block_width / 2,
                track_y,
            )
        )
        block = RoundedRectangle(
            width=block_width,
            height=0.82,
            corner_radius=0.12,
            fill_color=DISP_FILL,
            fill_opacity=1,
            stroke_color=DISP,
            stroke_width=4,
        )
        block.add_updater(
            lambda mob: mob.move_to(np.array([block_x(), track_y, 0.0]))
        )

        velocity_arrow = always_redraw(
            lambda: safe_horizontal_arrow(
                np.array([block_x(), track_y + 0.90, 0.0]),
                1.20 * v_norm(),
                VELOCITY,
            )
        )
        acceleration_arrow = always_redraw(
            lambda: safe_horizontal_arrow(
                np.array([block_x(), track_y - 0.78, 0.0]),
                1.12 * a_norm(),
                ACCEL,
            )
        )
        displacement_arrow = always_redraw(
            lambda: safe_horizontal_arrow(
                np.array([equilibrium_x, track_y - 1.25, 0.0]),
                amplitude * x_norm(),
                DISP,
            )
        )

        position_marks = VGroup()
        for x, label in (
            (equilibrium_x - amplitude, "-A"),
            (equilibrium_x, "0"),
            (equilibrium_x + amplitude, "+A"),
        ):
            tick = Line(
                np.array([x, track_y - 0.12, 0.0]),
                np.array([x, track_y + 0.12, 0.0]),
                color=GUIDE,
                stroke_width=2.2,
            )
            text = MathTex(label, color=MUTED).scale(0.48)
            text.move_to(np.array([x, track_y - 0.40, 0.0]))
            position_marks.add(tick, text)

        legend = VGroup(
            legend_item(DISP, r"x"),
            legend_item(VELOCITY, r"v_x"),
            legend_item(ACCEL, r"a_x,\ F_x"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        legend.move_to(np.array([-2.35, -2.35, 0.0]))

        dial_center = np.array([-5.15, -2.30, 0.0])
        dial_radius = 0.72
        dial = Circle(
            radius=dial_radius,
            color=GUIDE,
            stroke_width=2.7,
        ).move_to(dial_center)
        dial_cross = VGroup(
            Line(
                dial_center + LEFT * dial_radius,
                dial_center + RIGHT * dial_radius,
                color=BORDER,
                stroke_width=1.6,
            ),
            Line(
                dial_center + DOWN * dial_radius,
                dial_center + UP * dial_radius,
                color=BORDER,
                stroke_width=1.6,
            ),
        )
        dial_pointer = always_redraw(
            lambda: Arrow(
                dial_center,
                dial_center
                + dial_radius
                * np.array(
                    [
                        np.cos(phase.get_value()),
                        np.sin(phase.get_value()),
                        0.0,
                    ]
                ),
                buff=0,
                color=DISP,
                stroke_width=5.5,
                max_tip_length_to_length_ratio=0.18,
            )
        )
        dial_dot = Dot(dial_center, radius=0.045, color=INK)
        dial_label = Text(
            "фаза",
            font="Arial",
            font_size=20,
            color=MUTED,
        )
        dial_label.move_to(dial_center + np.array([0.0, -1.08, 0.0]))
        dial_zero = MathTex("0", color=MUTED).scale(0.38)
        dial_zero.move_to(dial_center + np.array([0.96, 0.0, 0.0]))
        dial_half_pi = MathTex(r"\frac{\pi}{2}", color=MUTED).scale(0.38)
        dial_half_pi.move_to(dial_center + np.array([0.0, 0.94, 0.0]))
        dial_pi = MathTex(r"\pi", color=MUTED).scale(0.38)
        dial_pi.move_to(dial_center + np.array([-0.95, 0.0, 0.0]))

        persistent = VGroup(
            title,
            divider,
            oscillator_label,
            track,
            wall_hatching,
            wall,
            equilibrium,
            spring,
            block,
            velocity_arrow,
            acceleration_arrow,
            displacement_arrow,
            position_marks,
            legend,
            dial,
            dial_cross,
            dial_pointer,
            dial_dot,
            dial_label,
            dial_zero,
            dial_half_pi,
            dial_pi,
        )

        phase_heading = Text(
            "1. Амплитуда и фаза",
            font="Arial",
            font_size=34,
            weight="BOLD",
            color=INK,
        ).move_to(np.array([3.55, 2.37, 0.0]))
        phase_formula = MathTex(
            r"\theta=\omega t+\varphi_0",
            color=INK,
        ).scale(0.92)
        phase_law = MathTex(
            r"x(t)=A\sin\theta",
            color=DISP,
        ).scale(1.02)
        phase_bounds = MathTex(
            r"-A\le x\le A",
            color=INK,
        ).scale(0.86)
        phase_text = Text(
            "A задаёт границы движения,\nначальная фаза — состояние при t = 0",
            font="Arial",
            font_size=25,
            color=MUTED,
            line_spacing=1.15,
        )
        phase_group = VGroup(
            phase_heading,
            phase_formula,
            phase_law,
            phase_bounds,
            phase_text,
        )
        VGroup(phase_formula, phase_law, phase_bounds, phase_text).arrange(
            DOWN,
            buff=0.50,
        ).move_to(np.array([3.55, -0.15, 0.0]))

        kinematics_heading = Text(
            "2. Кинематическое описание",
            font="Arial",
            font_size=32,
            weight="BOLD",
            color=INK,
        ).move_to(np.array([3.55, 2.37, 0.0]))
        kinematics_formulas = VGroup(
            MathTex(r"x=A\sin\theta", color=DISP).scale(0.82),
            MathTex(r"v_x=x'_t=\omega A\cos\theta", color=VELOCITY).scale(0.82),
            MathTex(r"a_x=(v_x)'_t=-\omega^2x", color=ACCEL).scale(0.82),
            MathTex(r"a_x+\omega^2x=0", color=INK).scale(0.82),
        ).arrange(DOWN, buff=0.36)
        kinematics_formulas.move_to(np.array([3.55, 0.55, 0.0]))
        at_center = MathTex(
            r"x=0:\quad |v|=v_{\max},\quad a_x=0",
            color=INK,
        ).scale(0.67)
        at_extreme = MathTex(
            r"|x|=A:\quad v=0,\quad |a|=a_{\max}",
            color=INK,
        ).scale(0.67)
        state_notes = VGroup(at_center, at_extreme).arrange(DOWN, buff=0.25)
        state_notes.move_to(np.array([3.55, -2.02, 0.0]))
        kinematics_group = VGroup(
            kinematics_heading,
            kinematics_formulas,
            state_notes,
        )

        dynamics_heading = Text(
            "3. Динамическое описание",
            font="Arial",
            font_size=33,
            weight="BOLD",
            color=INK,
        ).move_to(np.array([3.55, 2.37, 0.0]))
        dynamics_formulas = VGroup(
            MathTex(r"ma_x=F_x", color=INK).scale(0.92),
            MathTex(r"ma_x=-kx", color=ACCEL).scale(0.98),
            MathTex(r"k=m\omega^2", color=INK).scale(0.92),
            MathTex(r"F_x=-kx", color=ACCEL).scale(0.98),
        ).arrange(DOWN, buff=0.43)
        dynamics_formulas.move_to(np.array([3.55, 0.45, 0.0]))
        dynamics_text = Text(
            "Сила и ускорение всегда\nнаправлены к положению x = 0",
            font="Arial",
            font_size=26,
            color=MUTED,
            line_spacing=1.15,
        ).move_to(np.array([3.55, -2.05, 0.0]))
        dynamics_group = VGroup(
            dynamics_heading,
            dynamics_formulas,
            dynamics_text,
        )

        energy_heading = Text(
            "4. Энергетическое описание",
            font="Arial",
            font_size=32,
            weight="BOLD",
            color=INK,
        ).move_to(np.array([3.55, 2.37, 0.0]))
        energy_formula_top = MathTex(
            r"\frac{mv^2}{2}+\frac{kx^2}{2}",
            color=INK,
        ).scale(0.68)
        energy_formula_bottom = MathTex(
            r"=\frac{mv_{\max}^2}{2}=\frac{kA^2}{2}=\mathrm{const}",
            color=INK,
        ).scale(0.64)
        energy_formula = VGroup(
            energy_formula_top,
            energy_formula_bottom,
        ).arrange(DOWN, buff=0.12)
        energy_formula.move_to(np.array([3.55, 1.30, 0.0]))

        energy_left = 1.38
        energy_width = 4.35
        energy_y = -0.68
        energy_border = Rectangle(
            width=energy_width,
            height=0.58,
            stroke_color=BORDER,
            stroke_width=3,
        ).move_to(np.array([energy_left + energy_width / 2, energy_y, 0.0]))

        def kinetic_bar() -> Rectangle:
            fraction = v_norm() ** 2
            width = max(energy_width * fraction, 0.002)
            return Rectangle(
                width=width,
                height=0.54,
                fill_color=KINETIC,
                fill_opacity=0.90,
                stroke_width=0,
            ).move_to(np.array([energy_left + width / 2, energy_y, 0.0]))

        def potential_bar() -> Rectangle:
            kinetic_fraction = v_norm() ** 2
            potential_fraction = x_norm() ** 2
            kinetic_width = energy_width * kinetic_fraction
            width = max(energy_width * potential_fraction, 0.002)
            return Rectangle(
                width=width,
                height=0.54,
                fill_color=POTENTIAL,
                fill_opacity=0.90,
                stroke_width=0,
            ).move_to(
                np.array(
                    [energy_left + kinetic_width + width / 2, energy_y, 0.0]
                )
            )

        energy_kinetic = always_redraw(kinetic_bar)
        energy_potential = always_redraw(potential_bar)
        energy_legend = VGroup(
            legend_item(KINETIC, r"E_k=\frac{mv^2}{2}"),
            legend_item(POTENTIAL, r"E_p=\frac{kx^2}{2}"),
        ).arrange(RIGHT, buff=0.55)
        energy_legend.move_to(np.array([3.55, -0.08, 0.0]))
        total_energy = MathTex(
            r"E_k+E_p=E=\mathrm{const}",
            color=INK,
        ).scale(0.72)
        total_energy.move_to(np.array([3.55, -1.30, 0.0]))
        amplitude_links = MathTex(
            r"v_{\max}=\omega A,\qquad a_{\max}=\omega^2A",
            color=INK,
        ).scale(0.82)
        amplitude_links.move_to(np.array([3.55, -2.28, 0.0]))
        energy_group = VGroup(
            energy_heading,
            energy_formula,
            energy_kinetic,
            energy_potential,
            energy_border,
            energy_legend,
            total_energy,
            amplitude_links,
        )

        self.play(FadeIn(persistent), FadeIn(phase_group), run_time=0.8)
        self.wait(0.6)
        self.play(
            phase.animate.set_value(phase.get_value() + TAU),
            run_time=5.4,
            rate_func=linear,
        )

        self.play(
            FadeOut(phase_group),
            FadeIn(kinematics_group),
            run_time=0.65,
        )
        self.play(
            phase.animate.set_value(phase.get_value() + TAU),
            run_time=6.0,
            rate_func=linear,
        )

        self.play(
            FadeOut(kinematics_group),
            FadeIn(dynamics_group),
            run_time=0.65,
        )
        self.play(
            phase.animate.set_value(phase.get_value() + TAU),
            run_time=5.4,
            rate_func=linear,
        )

        self.play(
            FadeOut(dynamics_group),
            FadeIn(energy_group),
            run_time=0.65,
        )
        self.play(
            phase.animate.set_value(phase.get_value() + TAU),
            run_time=6.0,
            rate_func=linear,
        )
        self.wait(1.2)
