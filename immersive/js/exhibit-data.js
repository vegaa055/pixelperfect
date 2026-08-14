/* ============================================================
   Exhibit manifest — what hangs where.
   `wall` is a hint; the builder spaces pieces evenly along each
   wing's z-range, so ordering here is hanging order.
   ============================================================ */

const IMG = '../img/';

export const ARTWORKS = {

	/* ---------------- WING 1 — Photography ---------------- */
	gallery: {
		left: [
			{ src: IMG + 'gallery/2.jpg',  title: 'Thunderbird',        medium: 'Archival pigment print', year: '2024',
			  text: 'A rained-out car meet, an hour of flat grey sky, and the one red thing in the frame. Shot handheld at f/2 while the owner wiped the chrome dry.' },
			{ src: IMG + 'gallery/7.jpg',  title: 'Held Breath',        medium: 'Silver gelatin print',   year: '2023',
			  text: 'The half-second before movement. We waited forty minutes for the room to go quiet enough to take it.' },
			{ src: IMG + 'gallery/12.jpg', title: 'Threshold',          medium: 'Archival pigment print', year: '2023',
			  text: 'Doorways are honest. Everything worth photographing is either arriving or leaving.' },
		],
		right: [
			{ src: IMG + 'gallery/30.jpg', title: 'Legend of the Phoenix', medium: 'Silver gelatin print', year: '2025',
			  text: 'An abandoned foundry, a borrowed armchair, and a trumpet that had not been played in years. The first frame of the roll and the only one we kept.' },
			{ src: IMG + 'gallery/1.jpg',  title: 'First Light',        medium: 'Archival pigment print', year: '2024',
			  text: 'Taken nineteen minutes before sunrise, when the light has colour but no direction yet.' },
			{ src: IMG + 'gallery/5.jpg',  title: 'Follow Through',     medium: 'Silver gelatin print',   year: '2023',
			  text: 'A photograph rarely ends when the shutter closes. This one took three print tests and a long look the next morning.' },
			{ src: IMG + 'gallery/8.jpg',  title: 'Quiet Study',        medium: 'Archival pigment print', year: '2022',
			  text: 'No subject, no story, no title for a year. Sometimes a frame is just a good argument between light and shadow.' },
			{ src: IMG + 'gallery/32.jpg', title: 'Nightfall',          medium: 'Archival pigment print', year: '2025',
			  text: 'Pushed two stops in development. The grain is not a flaw; it is the texture of the hour.' },
			{ src: IMG + 'gallery/36.jpg', title: 'Afterglow',          medium: 'Archival pigment print', year: '2025',
			  text: 'The last usable minute of the day, which is almost always the best one.' },
			{ src: IMG + 'gallery/15.jpg', title: 'Fear and Panic in the Air', medium: 'Silver gelatin print', year: '2022',
			  text: 'Bad light, wrong lens, no time. The frame we very nearly deleted.' },
		],
	},

	/* ---------------- WING 2 — Illustration ---------------- */
	portfolio: {
		left: [
			{ src: IMG + 'folio/32.jpg', title: 'Lips Feel Warm',  medium: 'Digital painting', year: '2025',
			  text: 'Built from a single value sketch outward. The colour was chosen last, after three days of greyscale.' },
			{ src: IMG + 'folio/33.jpg', title: 'Giving Infinity', medium: 'Digital painting', year: '2025',
			  text: 'A study in how far an edge can soften before a face stops reading as a face.' },
			{ src: IMG + 'folio/37.jpg', title: 'Back to Life',    medium: 'Digital painting', year: '2024',
			  text: 'Painted over a photograph, then the photograph was removed. What survived is the drawing underneath.' },
		],
		right: [
			{ src: IMG + 'folio/31.jpg', title: 'Dead Inside',            medium: 'Digital painting', year: '2025',
			  text: 'The first of the series, and still the one that set the palette: cold teal against warm skin.' },
			{ src: IMG + 'folio/35.jpg', title: 'Feel Me Now',            medium: 'Digital painting', year: '2024',
			  text: 'Brushwork left deliberately visible. We wanted the hand in it — no airbrush, no smoothing pass.' },
			{ src: IMG + 'folio/34.jpg', title: 'Touch the Sky',          medium: 'Digital painting', year: '2024',
			  text: 'A commission that changed halfway through, from portrait to something closer to weather.' },
			{ src: IMG + 'folio/38.jpg', title: 'On the Outside',         medium: 'Digital painting', year: '2023',
			  text: 'Composed to be seen from across a room. Up close it falls apart into marks, which is the intention.' },
			{ src: IMG + 'folio/39.jpg', title: 'Crushed & Pulverised',   medium: 'Digital painting', year: '2023',
			  text: 'The most heavily reworked piece here — eleven versions, and the ninth is the one on the wall.' },
			{ src: IMG + 'folio/40.jpg', title: "But You're",             medium: 'Digital painting', year: '2022',
			  text: 'An unfinished sketch we kept unfinished on purpose. The negative space does the work.' },
		],
		/* Freestanding feature wall, centre of the wing */
		feature: [
			{ src: IMG + 'folio/50.gif', title: 'Ablaze and Alive', medium: 'Motion study', year: '2025',
			  text: 'A looping motion study — the only moving piece in the collection. Shown here as a still plate; the full loop lives on the Portfolio page.' },
		],
	},

	/* ---------------- WING 3 — Journal ---------------- */
	journal: {
		right: [
			{ src: IMG + 'gallery/15.jpg', title: 'Fear and Panic in the Air', medium: 'Process', year: '13 June 2026',
			  text: 'On shooting in bad light, trusting the wrong lens, and why the frame you almost delete is often the one worth keeping. Six minutes, and a reminder that the shot you plan is rarely the shot you get.' },
			{ src: IMG + 'gallery/5.jpg',  title: 'Follow Through',            medium: 'Field Notes', year: '02 June 2026',
			  text: 'A photograph rarely ends when the shutter closes. The follow-through — the edit, the print test, the long look the next morning — is where a frame becomes a piece. We resist the urge to publish while the ink is still wet.' },
			{ src: IMG + 'gallery/36.jpg',  title: "Together We're Invincible", medium: 'Studio', year: '21 May 2026',
			  text: 'A subject who trusts the room, a stylist with a stubborn idea, an assistant who spots the shot we missed. How the studio actually runs on a shoot day, and the small rituals that keep everyone loose enough to make something honest.' },
			{ src: IMG + 'folio/33.jpg',   title: 'Between Two Mediums',       medium: 'Craft', year: '08 May 2026',
			  text: 'We move constantly between the camera and the canvas. What photography teaches painting, and what painting teaches photography — how building a portrait brushstroke by brushstroke changed the way we see contrast, edges and skin through a lens.' },
			{ src: IMG + 'gallery/2.jpg',  title: 'The Colour of Chrome',      medium: 'Field Notes', year: '19 April 2026',
			  text: 'A rained-out car meet turned into one of the best shoots of the year. Wet paint, a red tail-light and an hour of grey sky did more for us than any studio setup could. Chase the weather instead of avoiding it.' },
		],
	},
};

/* The single large piece closing the hall */
export const FINALE = {
	src: IMG + 'gallery/30.jpg',
	title: 'Like the Legend of the Phoenix',
	medium: 'Silver gelatin print — 1/1',
	year: '2025',
	text: 'The piece the studio is named for. Everything else in this hall is an attempt to take it again.',
};
