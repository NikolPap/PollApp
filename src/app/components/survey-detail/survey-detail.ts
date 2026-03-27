import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface SurveyOption {
letter: string;
text: string;
percentage: number;
}

interface SurveyQuestion {
id: number;
title: string;
subtext?: string;
options: SurveyOption[];
}

@Component({
selector: 'app-survey-detail',
imports: [RouterLink],
templateUrl: './survey-detail.html',
styleUrl: './survey-detail.scss',
})
export class SurveyDetail {
surveyMeta = {
status: 'Published',
endDate: '01.09.2025',
category: 'Team activities',
title: 'Lets Plan the Next Team Event Together',
description: 'We want to create team activities that everyone will enjoy – share your preferences and ideas in our survey to help us plan better experiences together.'
};
questions: SurveyQuestion[] =[
{
id: 1,
title: 'Which date would work best for you?',
subtext: 'More than one answers are possible.',
options:[
{ letter: 'A', text: '19.09.2025, Friday', percentage: 27 },
{ letter: 'B', text: '10.10.2025, Friday', percentage: 44 },
{ letter: 'C', text: '11.10.2025, Saturday', percentage: 3 },
{ letter: 'D', text: '31.10.2025, Friday', percentage: 26 },
]
},
{
id: 2,
title: 'Choose the activities you prefer',
subtext: 'More than one answers are possible.',
options:[
{ letter: 'A', text: 'Outdoor adventure like kayaking', percentage: 60 },
{ letter: 'B', text: 'Office Costume Party', percentage: 0 },
{ letter: 'C', text: 'Bowling, mini-golf, volleyball', percentage: 14 },
{ letter: 'D', text: 'Beach party, Music & cocktails', percentage: 26 },
{ letter: 'E', text: 'Escape room', percentage: 0 },
]
},
{
id: 3,
title: 'Whats most important to you in a team event?',
options:[
{ letter: 'A', text: 'Team bonding', percentage: 44 },
{ letter: 'B', text: 'Food and drinks', percentage: 3 },
{ letter: 'C', text: 'Trying something new', percentage: 26 },
{ letter: 'D', text: 'Keeping it low-key and stress-free', percentage: 27 },
]
},

{
id: 4,
title: 'How long would you prefer the event to last?',
options:[
{ letter: 'A', text: 'Half a day', percentage: 14 },
{ letter: 'B', text: 'Full day', percentage: 86 },
{ letter: 'C', text: 'Evening only', percentage: 0 },
]
}
];
}