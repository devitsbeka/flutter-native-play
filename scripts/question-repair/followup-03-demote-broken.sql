-- Move the broken questions back to the Library.
--
-- The bulk "move to production" in Question Studio promotes the whole Library
-- tab. That tab held two different things: the 641 rewrites this repair staged
-- for review, and 495 questions that had never been in production and were
-- never part of the repair. All of them went live together.
--
-- 154 questions are now broken for the player. 153 of them are from those
-- 495; none are from the 641 rewrites, which all passed their checks.
--
-- This demotes only what is actually broken, so the other 342 promoted
-- questions stay in the game:
--
--   question over 90 chars -> the card has no clamp, so it pushes the answers
--                             into a scroll region and the player sees two
--   answer over 48 chars   -> line-clamp-2 ellipsizes it mid-word
--   duplicate options      -> the same answer appears twice
--   contradicting twins    -> two copies with different correct answers
--
-- Production goes 7646 -> 7492 and broken goes to 0.
-- Nothing is deleted; these sit in the Library exactly as they did before.

BEGIN;

UPDATE public.questions SET
    in_production = false,
    updated_at = now()
  WHERE id IN (
    '010ff21e-bfba-430c-b222-758bed0dcb0a',  -- question-squeezes-answers
    '03183e9c-bcc7-488c-bd40-d080cc30bab2',  -- question-squeezes-answers
    '0387cbcc-8bcf-453b-95f1-f75b70093fe0',  -- question-squeezes-answers
    '05480ffb-ac27-4a3a-8dbb-4784308a5897',  -- question-squeezes-answers
    '05a34b41-1c07-4be0-849f-a932feb0e2f2',  -- answer-clipped-tv, question-squeezes-answers
    '05d8f0bc-4176-49c7-8b9a-723188b577e6',  -- question-squeezes-answers
    '069f604c-6aff-44f8-90f8-e956c420d569',  -- question-squeezes-answers
    '06e843cb-40b0-43d7-94c8-3afec2cac59d',  -- question-squeezes-answers
    '0abb8e56-1ab1-4570-b1b0-40b054e83c89',  -- question-squeezes-answers
    '0bac04ea-04a4-470d-a74d-fa9e92afe67b',  -- question-squeezes-answers
    '0c78ade3-701d-415d-b3f2-14366129dd68',  -- question-squeezes-answers
    '0e3c48f7-1d68-4e25-a0e9-50142ecb682c',  -- question-squeezes-answers
    '0ec7baee-1648-4eff-a373-22e411561a05',  -- question-squeezes-answers
    '0f5ec842-5905-49ff-9044-b1ef05e8ce3c',  -- answer-clipped-tv, question-squeezes-answers
    '13da3309-a671-40cd-8b60-a3800f674522',  -- question-squeezes-answers
    '162d0adc-c938-45cf-aae3-49c136bb03c2',  -- question-squeezes-answers
    '1633c4a8-1f4c-4af1-9e29-f68f22c353ea',  -- question-squeezes-answers
    '18d63d45-3944-4b3f-bbd4-0d07c509f305',  -- question-squeezes-answers
    '1a0b5123-f520-43bd-903c-b9e994d0487a',  -- answer-clipped-tv, question-squeezes-answers
    '1f2dd728-fb7a-4a7b-b00d-8f4581f6ba56',  -- question-squeezes-answers
    '1fc1be05-13c5-4bf0-9278-f9f0e71407a9',  -- question-squeezes-answers
    '23bd8d18-9226-42fe-8229-37a49146e6ae',  -- answer-clipped-phone, question-squeezes-answers
    '24d2b3a6-bbb9-44af-b50b-fd3da29660af',  -- question-squeezes-answers
    '2a0b6cbf-2a28-4009-bbe8-9d86dd9a42e3',  -- question-squeezes-answers
    '2decccf0-98ad-47e4-a93f-54129c379f05',  -- question-squeezes-answers
    '2f8c00fd-3e78-442a-b416-16db81d65a3d',  -- question-squeezes-answers
    '3047ded9-411b-4dbd-9d5c-b0a98bebe2e5',  -- question-squeezes-answers
    '3131ebd1-1da7-4136-a645-2579d1291064',  -- answer-clipped-phone, question-squeezes-answers
    '327dd3f3-5089-43f3-9633-089f2b63e178',  -- answer-clipped-tv, question-squeezes-answers
    '334a46a5-80d1-41c0-b0d8-4281446e43c3',  -- contradicting-duplicate
    '347461e2-5b1b-49df-92a7-c9f4396acece',  -- question-squeezes-answers
    '398a33c9-232a-48a9-a571-94c20c6deeb0',  -- question-squeezes-answers
    '3a2f7bbd-af6c-4995-acda-97db44071304',  -- question-squeezes-answers
    '3a8e8508-56fe-45ef-9d84-f3177cbccd85',  -- question-squeezes-answers
    '3bfe71a5-0470-4f19-ba0a-5ba55565bdcb',  -- question-squeezes-answers
    '3c5bf14c-5632-46a3-8134-2a0904af6d51',  -- question-squeezes-answers
    '3e4b98e6-6d40-4588-8d46-82556fd2a7c7',  -- question-squeezes-answers
    '3f2feb93-586d-4bd0-8b73-ecd2e4423602',  -- answer-clipped-tv, question-squeezes-answers
    '452c2672-dae7-4c41-94b1-f73c7b0533bf',  -- question-squeezes-answers
    '47ffa8d5-89b6-4cc1-9629-f550a7b5ba3f',  -- question-squeezes-answers
    '49d8a15f-0826-407c-80dc-4c3b12532c68',  -- question-squeezes-answers
    '4d007ea4-b8bf-4c8f-baf0-a1268e43903d',  -- question-squeezes-answers
    '4e2936eb-74c2-4b03-bf4c-e02e77d10d04',  -- question-squeezes-answers
    '4f929f6a-479b-4630-a88d-13fd17add4cc',  -- question-squeezes-answers
    '5183c325-c099-4a61-b99b-ce91c5a6b7b0',  -- question-squeezes-answers
    '51eab561-bb63-4930-97df-ad1d60335926',  -- question-squeezes-answers
    '55fefda5-0ffe-4154-a9d7-009cd8fef032',  -- answer-clipped-tv, question-squeezes-answers
    '57a63bf7-bcde-435f-9e5d-9b6f7506d948',  -- answer-clipped-phone, question-squeezes-answers
    '581e3fd3-1d5a-4a7b-b88f-6a90faa80264',  -- question-squeezes-answers
    '599f670f-f977-48de-9c8b-b450000e5ef2',  -- question-squeezes-answers
    '5c437036-71a0-44b3-a9d8-c5357414072e',  -- question-squeezes-answers
    '5cb63574-e860-49bb-b1c8-7593449f0c46',  -- question-squeezes-answers
    '5ed7c078-9ca1-4782-86a4-12965c395703',  -- question-squeezes-answers
    '61a524ac-d43b-4e5b-9c94-6ef1753fc44b',  -- answer-clipped-phone, question-squeezes-answers
    '62fa5c97-e1e5-415c-b74a-37c4ef591390',  -- question-squeezes-answers
    '63838fb7-ef39-4405-9850-de722bcdf201',  -- question-squeezes-answers
    '64c60e99-b98c-48d0-855d-00402005ef6b',  -- answer-clipped-phone, question-squeezes-answers
    '65f3dd50-2899-44a4-9abf-2491eac92e4a',  -- question-squeezes-answers
    '66dbab92-a3dc-4568-bb67-7e5dd777312b',  -- question-squeezes-answers
    '67728c15-7284-476e-9fb7-84e95fd322e6',  -- question-squeezes-answers
    '67bf272c-545c-4178-81fa-a31da4330ade',  -- question-squeezes-answers
    '67c51224-6c2c-4217-a0ac-5b62a411b6cb',  -- question-squeezes-answers
    '6adeea3d-e62d-4498-9665-252331278750',  -- question-squeezes-answers
    '6b95eaed-676d-4766-8ac7-0d8d87838ddb',  -- question-squeezes-answers
    '6d8c82cc-8f52-43c6-9927-85ed8ef38ffe',  -- question-squeezes-answers
    '6e2e4b3c-d816-4ebf-9762-b428188faa5f',  -- question-squeezes-answers
    '732d9d5d-d451-484a-bd50-8836b0cd2de8',  -- question-squeezes-answers
    '74bcfccb-9144-461f-84f3-1bc3e0460866',  -- answer-clipped-tv, question-squeezes-answers
    '78ab62c4-ae0c-4037-b6df-b3ce371091a1',  -- duplicate-options, question-squeezes-answers
    '79f88c8d-08b1-4bde-ab8a-bf24786d4018',  -- question-squeezes-answers
    '7a58ef1d-d80d-4de9-9a15-c5bf85a644ec',  -- question-squeezes-answers
    '7aec688c-abd8-45af-9c43-459cf0f9112e',  -- question-squeezes-answers
    '7cdcd1ba-8987-4d3f-9ba0-4b2a7f1761bf',  -- question-squeezes-answers
    '7dce3568-23ba-4c06-a807-549be495f6d8',  -- question-squeezes-answers
    '803a9fa6-90a7-44e5-9a93-4d8b071aa548',  -- question-squeezes-answers
    '8147112e-675b-46ce-af36-44983d513dac',  -- question-squeezes-answers
    '8233693e-066a-40ac-be3d-0f465da7aeac',  -- question-squeezes-answers
    '8291f81e-cec6-49da-9c29-6c33f05b254f',  -- question-squeezes-answers
    '8317a156-7355-4954-bf98-c5d4f5c77606',  -- question-squeezes-answers
    '86d4d5ba-905d-4249-a441-c64e4a190262',  -- question-squeezes-answers
    '893ca9d5-488a-4a1b-a73d-99a3427a82bf',  -- answer-clipped-tv, question-squeezes-answers
    '8a0336be-b330-41d7-b426-335b02b63d32',  -- question-squeezes-answers
    '8a57434c-24af-4020-895b-8e1d036edffd',  -- question-squeezes-answers
    '8a768685-502b-43ea-ab1a-f4bd5a3445ee',  -- question-squeezes-answers
    '8e1f959a-8b0a-4a0f-add1-462f9fd6fdd7',  -- question-squeezes-answers
    '9283f4d9-ba5f-42ad-a25f-4a2936d4c9e9',  -- question-squeezes-answers
    '9649982a-f694-4497-8108-acbaa2632d2a',  -- answer-clipped-tv, question-squeezes-answers
    '96e78e9b-ec94-4b7a-901a-c2a136760c38',  -- question-squeezes-answers
    '97ee191f-45ff-4b21-a755-2e3987a2d3b1',  -- question-squeezes-answers
    '9918fe73-9341-4227-91cc-8a5b6faaf246',  -- question-squeezes-answers
    '998c237d-becc-452d-9461-7bf9f3bdceb7',  -- answer-clipped-phone, question-squeezes-answers
    '9a2e4001-f844-4e65-bdff-026b4987b45a',  -- question-squeezes-answers
    '9da8d70b-3fea-4c2a-8b39-58006c0a033f',  -- question-squeezes-answers
    '9dcb59cb-7ae5-4e05-8f31-6feef1b83fe8',  -- question-squeezes-answers
    '9f22419a-f690-4832-b6ed-24cfbc4cc1ce',  -- question-squeezes-answers
    '9f2c7708-f442-4fab-82c8-345c7ee3189c',  -- question-squeezes-answers
    '9fc9e8fd-732c-4825-8a97-00d17004c361',  -- question-squeezes-answers
    'a0ac84a7-6f4e-430e-8f32-f6335678c544',  -- answer-clipped-tv, question-squeezes-answers
    'a555d56d-2fee-4216-8ab2-05ac89c37cca',  -- question-squeezes-answers
    'a6009235-33db-41be-ab61-1a6895059e30',  -- question-squeezes-answers
    'a81aacd8-b3b6-46f3-a61d-2ae4e7ec78f8',  -- question-squeezes-answers
    'aba3f157-a77d-4ac7-9408-1057b00627a7',  -- question-squeezes-answers
    'acd419cf-75a8-4890-9451-1de4744e39b7',  -- answer-clipped-phone, question-squeezes-answers
    'ada05831-6881-4806-8c29-3c36ab2c7bcf',  -- question-squeezes-answers
    'b02bd858-60a7-4856-8eea-3772fb68016a',  -- question-squeezes-answers
    'b050fb9e-2b80-4de6-b6c8-8f38c80ce16c',  -- question-squeezes-answers
    'b4bc59f4-4619-4683-b42b-453c720d2c7f',  -- question-squeezes-answers
    'b6709046-1341-4761-92fd-5effd3dd2e72',  -- question-squeezes-answers
    'b81e6dee-0884-4f19-8d68-a562670567c2',  -- contradicting-duplicate
    'b87ee2c6-f175-48eb-8cb2-760bd05bae81',  -- question-squeezes-answers
    'ba24f42c-adf0-4269-923c-a6360194dff3',  -- question-squeezes-answers
    'bac7dc3d-5570-445d-a37f-f1a367980d58',  -- question-squeezes-answers
    'bba52df0-43bc-442c-a39e-32b2c00eaaf4',  -- question-squeezes-answers
    'bdf8ecf9-87ee-45a0-8917-d6b352217f19',  -- question-squeezes-answers
    'bef6cac5-4fa0-44e1-aabd-0e4c117ce904',  -- question-squeezes-answers
    'bef90ffc-ce6b-4c53-9a34-76559eb106e0',  -- question-squeezes-answers
    'c221dd12-18bc-4e71-a1ae-2b8228cb0e42',  -- question-squeezes-answers
    'c6fb15a1-822b-4b60-ba88-f257db106106',  -- answer-clipped-tv, question-squeezes-answers
    'c916573e-b76a-4306-9ce8-488a57c2d2a9',  -- question-squeezes-answers
    'c9613fd2-f1d4-401a-ba7c-5967dd11a4fc',  -- question-squeezes-answers
    'ca478f8f-acd2-4876-9f25-1b31673c4d38',  -- question-squeezes-answers
    'd062f9f0-a097-49fc-9048-c75e78126196',  -- question-squeezes-answers
    'd47b6566-01d7-47b8-ad32-0cee2158d9ed',  -- question-squeezes-answers
    'd48768f3-f6e7-4229-92a3-88026ea05f06',  -- question-squeezes-answers
    'd72b0368-8e11-4388-86bd-0fb676d2c6a6',  -- question-squeezes-answers
    'd87d686f-40bc-4a1b-a67a-8aa8722620b8',  -- question-squeezes-answers
    'd8ad4185-5a33-4291-b66a-dcc9e0a9007c',  -- question-squeezes-answers
    'db7bc02f-d71e-45af-83db-6feb7c9fd280',  -- question-squeezes-answers
    'dcbe9fb1-cd44-43b2-ab70-0ecf2a565505',  -- question-squeezes-answers
    'df09e915-5eda-4ca4-a558-958e891ba5ee',  -- question-squeezes-answers
    'e0a90f8a-d876-4b66-a59e-d7854c525ecc',  -- question-squeezes-answers
    'e431eca2-d0b5-4c61-839f-96229f866d60',  -- question-squeezes-answers
    'e542c0d2-ece3-406c-ac3f-ccf2a7c0a942',  -- question-squeezes-answers
    'e7322064-a163-420d-be2c-c240a5667b0b',  -- question-squeezes-answers
    'e77ee6c2-1e33-446d-8557-a12158ea27ec',  -- question-squeezes-answers
    'e7d8cdb7-9760-47ef-a089-456e5cfc5175',  -- answer-clipped-tv, question-squeezes-answers
    'e8715eec-1f57-4146-8f2f-8cf54784af55',  -- question-squeezes-answers
    'ea17cd73-3952-4493-8398-919dc41b92e3',  -- answer-clipped-tv, question-squeezes-answers
    'eb7acdc9-ff60-4044-b9e2-ef79595d4a09',  -- question-squeezes-answers
    'ec788a4f-d851-4ebe-88da-6a82addd41ec',  -- answer-clipped-tv, question-squeezes-answers
    'eddcca2a-55f2-414d-b399-fdb044842e46',  -- question-squeezes-answers
    'eeecfd0d-1162-4b1a-8e6f-4d7cddbf7b92',  -- question-squeezes-answers
    'ef219fb0-57c8-46ba-a243-bbb293666d1b',  -- question-squeezes-answers
    'f059e7bd-a3ae-45bb-92e5-151f1bad1d77',  -- question-squeezes-answers
    'f1231c3e-e956-49e9-a2f8-95a16296164f',  -- question-squeezes-answers
    'f3c382fb-9f91-4fef-b15c-c8d40b1b4509',  -- question-squeezes-answers
    'f3d0fa4d-7077-42ff-9540-43cc1fe92377',  -- question-squeezes-answers
    'f6810619-2d5b-4254-9e8a-3995e09afe47',  -- question-squeezes-answers
    'fc95d58b-1cac-4396-9362-3122ca73e11f',  -- question-squeezes-answers
    'fd484e92-aa16-4097-8df8-6c6dc11bd386',  -- question-squeezes-answers
    'fdbe7539-a281-4ce8-9291-eeeeb5c9ebca',  -- question-squeezes-answers
    'fe48bcd2-8b0d-4e38-bb52-cbe8e0d7161b',  -- question-squeezes-answers
    'fe996b13-34fc-4485-a61b-b3955b9b2af4',  -- question-squeezes-answers
    'ff9605e8-2e5d-4b47-8334-d6887d22c1bb'  -- question-squeezes-answers
  );

COMMIT;
