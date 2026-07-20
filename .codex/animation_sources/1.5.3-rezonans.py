"""Manim animation for section 1.5.3: forced oscillations and resonance.

The scene is built from scratch and does not reuse the previous resonance
diagram.  Three identical damped oscillators are driven with the same force
amplitude at frequencies below, near, and above their natural frequency.  The
motion is precomputed with RK4; the differential equation is intentionally not
shown because item 1.5.3 of the codifier contains no required formulas.
"""

from __future__ import annotations

import numpy as np

from manim import (
    DOWN,
    LEFT,
    RIGHT,
    UP,
    Arrow,
    DashedLine,
    FadeIn,
    FadeOut,
    Line,
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


config.background_color = "#F8FAFC"
config.pixel_width = 1280
config.pixel_height = 720
config.frame_rate = 30

CANVAS = "#F8FAFC"
PANEL = "#FFFFFF"
INK = "#0F172A"
MUTED = "#475569"
GUIDE = "#94A3B8"
BORDER = "#CBD5E1"
SPRING = "#64748B"
FORCE = "#2563EB"
BLUE = "#2563EB"
BLUE_PALE = "#DBEAFE"
AMBER = "#B45309"
AMBER_PALE = "#FEF3C7"
TEAL = "#0F766E"
TEAL_PALE = "#CCFBF1"


def integrate_driven_oscillator(
    ratio: float,
    *,
    t_max: float,
    dt: float = 0.004,
    damping: float = 0.075,
    force_amplitude: float = 0.24,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Integrate x'' + 2*damping*x' + x = force*sin(ratio*t)."""

    steps = int(np.ceil(t_max / dt)) + 1
    times = np.linspace(0.0, t_max, steps)
    positions = np.zeros(steps)
    velocities = np.zeros(steps)

    def derivative(time: float, state: np.ndarray) -> np.ndarray:
        x, velocity = state
        acceleration = (
            force_amplitude * np.sin(ratio * time)
            - 2.0 * damping * velocity
            - x
        )
        return np.array([velocity, acceleration], dtype=float)

    state = np.array([0.0, 0.0], dtype=float)
    for index in range(steps - 1):
        time = times[index]
        step = times[index + 1] - time
        k1 = derivative(time, state)
        k2 = derivative(time + step / 2.0, state + step * k1 / 2.0)
        k3 = derivative(time + step / 2.0, state + step * k2 / 2.0)
        k4 = derivative(time + step, state + step * k3)
        state = state + step * (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0
        positions[index + 1], velocities[index + 1] = state

    envelope = np.maximum.accumulate(np.abs(positions))
    return times, positions, envelope


def make_spring(start_x: float, end_x: float, y: float) -> VMobject:
    """Return a readable spring for the current mass position."""

    lead = 0.13
    amplitude = 0.09
    turns = 13
    usable = max(end_x - start_x - 2.0 * lead, 0.20)
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
    return VMobject().set_points_as_corners(points).set_stroke(SPRING, 3.2)


def force_arrow(origin: np.ndarray, signed_length: float) -> Arrow:
    """Create a horizontal force arrow that remains valid at zero force."""

    magnitude = abs(signed_length)
    direction = 1.0 if signed_length >= 0 else -1.0
    visible_length = max(magnitude, 0.045)
    arrow = Arrow(
        origin,
        origin + RIGHT * direction * visible_length,
        buff=0,
        color=FORCE,
        stroke_width=4.2,
        max_tip_length_to_length_ratio=0.22,
    )
    arrow.set_opacity(min(1.0, magnitude / 0.16))
    return arrow


class ResonanceComparison(Scene):
    """Compare three identical oscillators under three driving frequencies."""

    def construct(self) -> None:
        t_max = 16.0 * np.pi
        ratios = [0.65, 1.00, 1.55]
        row_y = [1.48, 0.00, -1.48]
        colors = [BLUE, AMBER, TEAL]
        pale_colors = [BLUE_PALE, AMBER_PALE, TEAL_PALE]
        headings = [
            "Воздействие медленнее",
            "Воздействие в такт",
            "Воздействие быстрее",
        ]
        subheadings = [
            "ниже собственной частоты",
            "резонанс",
            "выше собственной частоты",
        ]
        result_words = ["небольшая", "наибольшая", "небольшая"]

        simulations = [
            integrate_driven_oscillator(ratio, t_max=t_max) for ratio in ratios
        ]
        amplitude_reference = max(envelope[-1] for _, _, envelope in simulations)

        clock = ValueTracker(0.0)

        title = Text(
            "Одинаковые системы — разный отклик",
            font="Arial",
            font_size=40,
            weight="BOLD",
            color=INK,
        )
        title.scale_to_fit_width(11.6).move_to(np.array([0.0, 3.52, 0.0]))
        subtitle = Text(
            "Сила и потери одинаковы; меняется только частота внешнего воздействия",
            font="Arial",
            font_size=20,
            color=MUTED,
        )
        subtitle.scale_to_fit_width(11.2).move_to(np.array([0.0, 3.08, 0.0]))

        column_response = Text(
            "движение груза",
            font="Arial",
            font_size=15,
            color=MUTED,
        ).move_to(np.array([-0.20, 2.66, 0.0]))
        column_amplitude = Text(
            "накопленная амплитуда",
            font="Arial",
            font_size=15,
            color=MUTED,
        ).move_to(np.array([4.55, 2.66, 0.0]))

        cards = VGroup()
        static_parts = VGroup(title, subtitle, column_response, column_amplitude)
        dynamic_parts = VGroup()
        final_labels = VGroup()

        wall_x = -2.72
        equilibrium_x = 0.22
        mass_width = 0.66
        movement_scale = 0.92
        gauge_left = 3.45
        gauge_width = 2.10

        for index, y in enumerate(row_y):
            ratio = ratios[index]
            color = colors[index]
            pale = pale_colors[index]
            times, positions, envelope = simulations[index]

            card = RoundedRectangle(
                width=12.35,
                height=1.28,
                corner_radius=0.18,
                fill_color=PANEL,
                fill_opacity=1,
                stroke_color=BORDER,
                stroke_width=1.6,
            ).move_to(np.array([0.0, y, 0.0]))
            cards.add(card)

            heading = Text(
                headings[index],
                font="Arial",
                font_size=20,
                weight="BOLD",
                color=color,
            )
            if heading.width > 2.25:
                heading.scale_to_fit_width(2.25)
            heading.move_to(np.array([-4.92, y + 0.17, 0.0]))
            subheading = Text(
                subheadings[index],
                font="Arial",
                font_size=13,
                color=MUTED,
            )
            if subheading.width > 2.25:
                subheading.scale_to_fit_width(2.25)
            subheading.move_to(np.array([-4.92, y - 0.24, 0.0]))

            divider_left = Line(
                np.array([-3.42, y - 0.46, 0.0]),
                np.array([-3.42, y + 0.46, 0.0]),
                color=BORDER,
                stroke_width=1.2,
            )
            divider_right = Line(
                np.array([3.02, y - 0.46, 0.0]),
                np.array([3.02, y + 0.46, 0.0]),
                color=BORDER,
                stroke_width=1.2,
            )

            track_y = y - 0.24
            oscillator_y = y + 0.05
            wall = Line(
                np.array([wall_x, track_y - 0.28, 0.0]),
                np.array([wall_x, oscillator_y + 0.32, 0.0]),
                color=INK,
                stroke_width=3.0,
            )
            hatching = VGroup(
                *[
                    Line(
                        np.array([wall_x - 0.20, yy - 0.12, 0.0]),
                        np.array([wall_x, yy, 0.0]),
                        color=GUIDE,
                        stroke_width=1.2,
                    )
                    for yy in np.linspace(track_y - 0.20, oscillator_y + 0.27, 5)
                ]
            )
            track = Line(
                np.array([wall_x, track_y, 0.0]),
                np.array([2.55, track_y, 0.0]),
                color=GUIDE,
                stroke_width=1.8,
            )
            equilibrium = DashedLine(
                np.array([equilibrium_x, track_y - 0.12, 0.0]),
                np.array([equilibrium_x, oscillator_y + 0.44, 0.0]),
                dash_length=0.06,
                dashed_ratio=0.55,
                color=GUIDE,
                stroke_width=1.2,
            )

            def sampled_position(
                current_times: np.ndarray = times,
                current_positions: np.ndarray = positions,
            ) -> float:
                return float(
                    np.interp(clock.get_value(), current_times, current_positions)
                )

            def sampled_envelope(
                current_times: np.ndarray = times,
                current_envelope: np.ndarray = envelope,
            ) -> float:
                return float(
                    np.interp(clock.get_value(), current_times, current_envelope)
                )

            def mass_x(get_position=sampled_position) -> float:
                return equilibrium_x + movement_scale * get_position()

            spring = always_redraw(
                lambda get_x=mass_x, yy=oscillator_y: make_spring(
                    wall_x,
                    get_x() - mass_width / 2.0,
                    yy,
                )
            )
            mass = RoundedRectangle(
                width=mass_width,
                height=0.58,
                corner_radius=0.10,
                fill_color=pale,
                fill_opacity=1,
                stroke_color=color,
                stroke_width=3.0,
            )
            mass.add_updater(
                lambda mob, get_x=mass_x, yy=oscillator_y: mob.move_to(
                    np.array([get_x(), yy, 0.0])
                )
            )

            force = always_redraw(
                lambda current_ratio=ratio, get_x=mass_x, yy=oscillator_y: force_arrow(
                    np.array([get_x(), yy + 0.42, 0.0]),
                    0.70 * np.sin(current_ratio * clock.get_value()),
                )
            )

            envelope_marks = always_redraw(
                lambda current_color=color,
                get_envelope=sampled_envelope,
                ty=track_y,
                oy=oscillator_y: VGroup(
                    DashedLine(
                        np.array(
                            [
                                equilibrium_x - movement_scale * get_envelope(),
                                ty - 0.06,
                                0.0,
                            ]
                        ),
                        np.array(
                            [
                                equilibrium_x - movement_scale * get_envelope(),
                                oy + 0.29,
                                0.0,
                            ]
                        ),
                        dash_length=0.045,
                        color=current_color,
                        stroke_width=1.0,
                    ),
                    DashedLine(
                        np.array(
                            [
                                equilibrium_x + movement_scale * get_envelope(),
                                ty - 0.06,
                                0.0,
                            ]
                        ),
                        np.array(
                            [
                                equilibrium_x + movement_scale * get_envelope(),
                                oy + 0.29,
                                0.0,
                            ]
                        ),
                        dash_length=0.045,
                        color=current_color,
                        stroke_width=1.0,
                    ),
                ).set_opacity(0.52)
            )

            gauge_outline = RoundedRectangle(
                width=gauge_width,
                height=0.27,
                corner_radius=0.09,
                fill_opacity=0,
                stroke_color=BORDER,
                stroke_width=1.4,
            ).move_to(np.array([gauge_left + gauge_width / 2.0, y + 0.08, 0.0]))

            def amplitude_bar(
                current_color: str = color,
                current_pale: str = pale,
                get_envelope=sampled_envelope,
                bar_y: float = y,
            ) -> Rectangle:
                fraction = min(get_envelope() / amplitude_reference, 1.0)
                width = max(gauge_width * fraction, 0.004)
                return Rectangle(
                    width=width,
                    height=0.23,
                    fill_color=current_color,
                    fill_opacity=0.88,
                    stroke_color=current_pale,
                    stroke_width=0,
                ).move_to(
                    np.array([gauge_left + width / 2.0, bar_y + 0.08, 0.0])
                )

            gauge_fill = always_redraw(amplitude_bar)
            amplitude_label = Text(
                "амплитуда",
                font="Arial",
                font_size=12,
                color=MUTED,
            ).move_to(np.array([gauge_left + gauge_width / 2.0, y + 0.38, 0.0]))

            result = Text(
                result_words[index],
                font="Arial",
                font_size=15,
                weight="BOLD" if index == 1 else "NORMAL",
                color=color,
            ).move_to(np.array([gauge_left + gauge_width / 2.0, y - 0.30, 0.0]))
            final_labels.add(result)

            static_parts.add(
                heading,
                subheading,
                divider_left,
                divider_right,
                wall,
                hatching,
                track,
                equilibrium,
                gauge_outline,
                amplitude_label,
            )
            dynamic_parts.add(spring, envelope_marks, mass, force, gauge_fill)

        legend_arrow = Arrow(
            np.array([-5.72, -3.12, 0.0]),
            np.array([-5.05, -3.12, 0.0]),
            buff=0,
            color=FORCE,
            stroke_width=4.0,
            max_tip_length_to_length_ratio=0.22,
        )
        legend_text = Text(
            "внешняя сила",
            font="Arial",
            font_size=16,
            color=MUTED,
        ).next_to(legend_arrow, RIGHT, buff=0.18)
        takeaway = Text(
            "в такт → энергия накапливается → амплитуда больше",
            font="Arial",
            font_size=18,
            weight="BOLD",
            color=AMBER,
        )
        if takeaway.width > 6.1:
            takeaway.scale_to_fit_width(6.1)
        takeaway.move_to(np.array([2.45, -3.12, 0.0]))
        footer = VGroup(legend_arrow, legend_text, takeaway)

        scene_group = VGroup(cards, static_parts, dynamic_parts, footer)
        self.wait(0.12)
        self.play(FadeIn(scene_group), run_time=0.55)
        self.play(
            clock.animate.set_value(t_max),
            run_time=8.1,
            rate_func=linear,
        )
        self.play(FadeIn(final_labels), run_time=0.45)
        self.wait(0.75)
        self.play(
            FadeOut(scene_group),
            FadeOut(final_labels),
            run_time=0.55,
        )
        self.wait(0.12)
