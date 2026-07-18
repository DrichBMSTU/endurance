"""Manim animation for section 1.4.3: reactive motion.

The scene shows a closed system that is initially at rest. A packet of gas
moves left while the rocket moves right, so the momenta of the two parts are
equal and opposite and the total momentum remains zero.
"""

from __future__ import annotations

import numpy as np

from manim import (
    BLUE_D,
    WHITE,
    Arrow,
    Circle,
    DashedVMobject,
    Dot,
    FadeIn,
    FadeOut,
    MathTex,
    Polygon,
    Rectangle,
    RoundedRectangle,
    Scene,
    Text,
    ValueTracker,
    VGroup,
    always_redraw,
    config,
    smooth,
)


config.background_color = WHITE
config.pixel_width = 1920
config.pixel_height = 1080
config.frame_rate = 40

BLUE = "#2563EB"
BLUE_FILL = "#DBEAFE"
ORANGE = "#EA580C"
ORANGE_FILL = "#FFEDD5"
GREEN = "#15803D"
INK = "#0F172A"
MUTED = "#475569"
BORDER = "#CBD5E1"
GUIDE = "#94A3B8"


def make_rocket() -> VGroup:
    """Create a compact horizontal rocket pointing to the right."""

    body = RoundedRectangle(
        width=2.15,
        height=0.78,
        corner_radius=0.22,
        fill_color=BLUE_FILL,
        fill_opacity=1,
        stroke_color=BLUE_D,
        stroke_width=3.2,
    )
    nose = Polygon(
        np.array([1.02, 0.39, 0.0]),
        np.array([1.66, 0.0, 0.0]),
        np.array([1.02, -0.39, 0.0]),
        fill_color=BLUE,
        fill_opacity=1,
        stroke_color=BLUE_D,
        stroke_width=3.2,
    )
    nozzle = Polygon(
        np.array([-1.02, 0.28, 0.0]),
        np.array([-1.38, 0.36, 0.0]),
        np.array([-1.38, -0.36, 0.0]),
        np.array([-1.02, -0.28, 0.0]),
        fill_color=ORANGE_FILL,
        fill_opacity=1,
        stroke_color=ORANGE,
        stroke_width=3.0,
    )
    fin_top = Polygon(
        np.array([-0.45, 0.36, 0.0]),
        np.array([-0.92, 0.85, 0.0]),
        np.array([0.08, 0.36, 0.0]),
        fill_color=BLUE,
        fill_opacity=1,
        stroke_color=BLUE_D,
        stroke_width=2.6,
    )
    fin_bottom = Polygon(
        np.array([-0.45, -0.36, 0.0]),
        np.array([-0.92, -0.85, 0.0]),
        np.array([0.08, -0.36, 0.0]),
        fill_color=BLUE,
        fill_opacity=1,
        stroke_color=BLUE_D,
        stroke_width=2.6,
    )
    window = Circle(
        radius=0.18,
        fill_color=WHITE,
        fill_opacity=1,
        stroke_color=BLUE_D,
        stroke_width=3,
    ).shift(np.array([0.42, 0.0, 0.0]))
    return VGroup(fin_top, fin_bottom, nozzle, body, nose, window)


class ReactiveMotion(Scene):
    """Opposite momenta appear while the momentum of the system stays zero."""

    def construct(self) -> None:
        progress = ValueTracker(0.0)

        title = Text(
            "Реактивное движение",
            font="Arial",
            font_size=48,
            weight="BOLD",
            color=INK,
        ).move_to(np.array([0.0, 3.35, 0.0]))
        subtitle = Text(
            "Импульс перераспределяется внутри замкнутой системы",
            font="Arial",
            font_size=28,
            color=MUTED,
        ).move_to(np.array([0.0, 2.78, 0.0]))

        boundary_shape = RoundedRectangle(
            width=7.15,
            height=4.2,
            corner_radius=0.28,
            stroke_color=GUIDE,
            stroke_width=2.5,
        ).move_to(np.array([-3.15, -0.05, 0.0]))
        boundary = DashedVMobject(boundary_shape, num_dashes=42)
        boundary_label = Text(
            "система «ракета + газы»",
            font="Arial",
            font_size=25,
            color=MUTED,
        ).move_to(np.array([-3.15, 1.74, 0.0]))

        rocket_start = np.array([-2.40, 0.25, 0.0])
        rocket = make_rocket().scale(0.92).move_to(rocket_start)
        rocket.add_updater(
            lambda mob: mob.move_to(
                rocket_start + np.array([1.18 * progress.get_value(), 0.0, 0.0])
            )
        )

        gas_offsets = [
            (-0.28, 0.00),
            (-0.06, 0.20),
            (0.16, -0.18),
            (0.36, 0.12),
            (0.58, -0.04),
            (0.02, -0.32),
            (0.42, 0.34),
            (0.74, 0.22),
            (0.78, -0.30),
            (1.00, 0.00),
        ]
        gas = VGroup(
            *[
                Dot(
                    point=np.array([x, y, 0.0]),
                    radius=0.075 if index % 3 else 0.095,
                    color=ORANGE,
                )
                for index, (x, y) in enumerate(gas_offsets)
            ]
        )
        gas_start = np.array([-3.65, 0.25, 0.0])
        gas.move_to(gas_start)

        def update_gas(mob: VGroup) -> None:
            value = progress.get_value()
            mob.move_to(gas_start + np.array([-2.05 * value, 0.0, 0.0]))
            mob.set_opacity(value)

        gas.add_updater(update_gas)

        rocket_arrow = always_redraw(
            lambda: Arrow(
                rocket.get_center() + np.array([-0.72, -1.22, 0.0]),
                rocket.get_center()
                + np.array([-0.72 + 1.62 * max(progress.get_value(), 0.01), -1.22, 0.0]),
                buff=0,
                color=BLUE,
                stroke_width=7,
                max_tip_length_to_length_ratio=0.16,
            ).set_opacity(progress.get_value())
        )
        gas_arrow = always_redraw(
            lambda: Arrow(
                gas.get_center() + np.array([0.72, -1.22, 0.0]),
                gas.get_center()
                + np.array([0.72 - 1.62 * max(progress.get_value(), 0.01), -1.22, 0.0]),
                buff=0,
                color=ORANGE,
                stroke_width=7,
                max_tip_length_to_length_ratio=0.16,
            ).set_opacity(progress.get_value())
        )

        rocket_label = MathTex(r"\vec p_{\rm r}", color=BLUE).scale(0.68)
        rocket_label.add_updater(
            lambda mob: mob.move_to(rocket_arrow.get_center() + np.array([0.0, 0.34, 0.0]))
            .set_opacity(progress.get_value())
        )
        gas_label = MathTex(r"\vec p_{\rm g}", color=ORANGE).scale(0.68)
        gas_label.add_updater(
            lambda mob: mob.move_to(gas_arrow.get_center() + np.array([0.0, 0.34, 0.0]))
            .set_opacity(progress.get_value())
        )

        panel = RoundedRectangle(
            width=5.25,
            height=4.2,
            corner_radius=0.28,
            fill_color="#F8FAFC",
            fill_opacity=1,
            stroke_color=BORDER,
            stroke_width=2.5,
        ).move_to(np.array([3.55, -0.05, 0.0]))
        panel_title = Text(
            "Импульс всей системы",
            font="Arial",
            font_size=30,
            weight="BOLD",
            color=INK,
        ).move_to(np.array([3.55, 1.52, 0.0]))

        external_force = MathTex(r"\vec F_{\rm ext}=0", color=MUTED).scale(0.82)
        external_force.move_to(np.array([3.55, 0.82, 0.0]))
        external_caption = Text(
            "внешние силы скомпенсированы",
            font="Arial",
            font_size=21,
            color=MUTED,
        ).move_to(np.array([3.55, 0.37, 0.0]))

        total_formula = MathTex(
            r"\vec p_{\rm r}",
            "+",
            r"\vec p_{\rm g}",
            "=0",
        ).scale(0.92)
        total_formula[0].set_color(BLUE)
        total_formula[2].set_color(ORANGE)
        total_formula[1].set_color(INK)
        total_formula[3].set_color(GREEN)
        total_formula.move_to(np.array([3.55, -0.42, 0.0]))

        legend_rocket = VGroup(
            MathTex(r"\vec p_{\rm r}", color=BLUE).scale(0.56),
            Text("— импульс ракеты", font="Arial", font_size=22, color=INK),
        ).arrange(np.array([1.0, 0.0, 0.0]), buff=0.12)
        legend_gas = VGroup(
            MathTex(r"\vec p_{\rm g}", color=ORANGE).scale(0.56),
            Text("— импульс газов", font="Arial", font_size=22, color=INK),
        ).arrange(np.array([1.0, 0.0, 0.0]), buff=0.12)
        legend = VGroup(legend_rocket, legend_gas).arrange(
            np.array([0.0, -1.0, 0.0]),
            aligned_edge=np.array([-1.0, 0.0, 0.0]),
            buff=0.20,
        )
        legend.move_to(np.array([3.55, -1.28, 0.0]))

        self.add(
            title,
            subtitle,
            boundary,
            boundary_label,
            rocket,
            gas,
            rocket_arrow,
            gas_arrow,
            rocket_label,
            gas_label,
            panel,
            panel_title,
            external_force,
            external_caption,
            total_formula,
            legend,
        )

        curtain = Rectangle(
            width=14.4,
            height=8.2,
            fill_color=WHITE,
            fill_opacity=1,
            stroke_width=0,
        ).set_z_index(20)
        self.add(curtain)

        self.play(FadeOut(curtain), run_time=0.45)
        self.wait(0.55)
        self.play(
            progress.animate.set_value(1.0),
            run_time=3.0,
            rate_func=smooth,
        )
        self.wait(1.05)
        self.play(FadeIn(curtain), run_time=0.45)
