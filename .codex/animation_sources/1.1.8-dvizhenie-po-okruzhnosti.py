"""Manim animation for section 1.1.8: uniform circular motion.

The scene intentionally follows the visual language of the existing
``kinematics_*.gif`` assets: a white 16:9 canvas, thin teal geometry,
a brick-red moving point, restrained formulas, and linear timing.
"""

from __future__ import annotations

import numpy as np

from manim import (
    BLUE_D,
    GRAY_D,
    PI,
    TAU,
    WHITE,
    Arrow,
    Circle,
    DashedLine,
    Dot,
    MathTex,
    Scene,
    ValueTracker,
    VGroup,
    always_redraw,
    config,
    linear,
)


# Match the technical profile of the reference kinematics GIFs.
config.background_color = WHITE
config.pixel_width = 1920
config.pixel_height = 1080
config.frame_rate = 50

TEAL = "#1AA6A8"
RED = "#CF5148"
BLUE = "#2478C5"
INK = "#161616"
GUIDE = "#929AA4"


class CircularMotion(Scene):
    """One seamless revolution with velocity and centripetal acceleration."""

    def construct(self) -> None:
        center = np.array([-3.10, -0.15, 0.0])
        radius = 2.62
        velocity_length = 1.30
        acceleration_length = 1.32
        start_angle = -PI / 6

        angle = ValueTracker(start_angle)

        def radial_unit() -> np.ndarray:
            value = angle.get_value()
            return np.array([np.cos(value), np.sin(value), 0.0])

        def tangent_unit() -> np.ndarray:
            value = angle.get_value()
            return np.array([-np.sin(value), np.cos(value), 0.0])

        def particle_position() -> np.ndarray:
            return center + radius * radial_unit()

        orbit = Circle(radius=radius, color=TEAL, stroke_width=4).move_to(center)
        center_dot = Dot(center, radius=0.055, color=INK)
        center_label = MathTex("O", color=INK).scale(0.56)
        center_label.next_to(center_dot, np.array([-0.8, -0.8, 0.0]), buff=0.10)

        radius_line = always_redraw(
            lambda: DashedLine(
                center,
                particle_position(),
                color=GUIDE,
                stroke_width=2.2,
                dash_length=0.10,
                dashed_ratio=0.55,
            )
        )

        velocity_arrow = always_redraw(
            lambda: Arrow(
                particle_position(),
                particle_position() + velocity_length * tangent_unit(),
                buff=0,
                color=RED,
                stroke_width=6,
                max_tip_length_to_length_ratio=0.16,
            )
        )

        acceleration_arrow = always_redraw(
            lambda: Arrow(
                particle_position(),
                particle_position() - acceleration_length * radial_unit(),
                buff=0,
                color=BLUE,
                stroke_width=6,
                max_tip_length_to_length_ratio=0.16,
            )
        )

        particle = Dot(particle_position(), radius=0.095, color=RED)
        particle.add_updater(lambda mob: mob.move_to(particle_position()))

        velocity_label = MathTex(r"\vec v", color=RED).scale(0.62)
        velocity_label.add_updater(
            lambda mob: mob.move_to(
                particle_position() + (velocity_length + 0.34) * tangent_unit()
            )
        )

        acceleration_label = MathTex(r"\vec a_c", color=BLUE).scale(0.58)
        acceleration_label.add_updater(
            lambda mob: mob.move_to(
                particle_position()
                - 0.68 * acceleration_length * radial_unit()
                + 0.34 * tangent_unit()
            )
        )

        radius_label = MathTex("R", color=GRAY_D).scale(0.56)
        radius_label.add_updater(
            lambda mob: mob.move_to(
                center + 0.48 * radius * radial_unit() - 0.28 * tangent_unit()
            )
        )

        omega = MathTex(r"\omega=\mathrm{const}", color=TEAL).scale(0.82)
        speed_formula = MathTex(r"v=\omega R", color=TEAL).scale(0.86)
        acceleration_formula = MathTex(
            r"a_c=\frac{v^2}{R}=\omega^2R", color=BLUE_D
        ).scale(0.82)
        perpendicular = MathTex(r"\vec v\perp\vec a_c", color=INK).scale(0.80)

        formulas = VGroup(
            omega,
            speed_formula,
            acceleration_formula,
            perpendicular,
        ).arrange(
            direction=np.array([0.0, -1.0, 0.0]),
            aligned_edge=np.array([-1.0, 0.0, 0.0]),
            buff=0.58,
        )
        formulas.move_to(np.array([3.45, 0.30, 0.0]))

        self.add(
            orbit,
            radius_line,
            center_dot,
            center_label,
            velocity_arrow,
            acceleration_arrow,
            particle,
            velocity_label,
            acceleration_label,
            radius_label,
            formulas,
        )

        # A full turn makes the first and last states identical for smooth looping.
        self.play(
            angle.animate.set_value(start_angle + TAU),
            run_time=4.5,
            rate_func=linear,
        )
