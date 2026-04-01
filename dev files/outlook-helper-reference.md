# Outlook Helper Reference

This reference describes the helper surface exported by `dev files/outlook.js`.

## Shared conventions

- Object-based helpers accept the connector's original field casing and the lower-camel aliases used by the wrapper.
- Recipient fields accept semicolon-delimited strings, arrays of email strings, or arrays of objects with `Address`, `address`, or nested `EmailAddress.Address` values.
- Message selectors commonly accept `messageId` or `id`.
- Event selectors commonly accept `eventId` or `id`.
- Calendar selectors commonly accept `calendarId` or `table`.
- Contact selectors commonly accept `contactId` or `id`, and folder selectors commonly accept `folderId`, `folder`, or `table`.

## Mail helpers

| Export | Purpose | Accepted aliases |
| --- | --- | --- |
| `callOutlookOperation(operationName, parameters)` | Raw connector operation access. | Pass native connector parameter names directly. |
| `sendEmail(options)` | Send a message using V2 by default, or legacy plain-text when `isHtml === false`. | `to/To`, `cc/Cc`, `bcc/Bcc`, `subject/Subject`, `body/Body`, `isHtml/IsHtml`, `importance/Importance`, `attachments/Attachments`, `replyTo/ReplyTo`, `from/From`, `sensitivity/Sensitivity`. |
| `getEmail(messageId, options)` | Load a single message. | `messageId/id`, `mailboxAddress/MailboxAddress`, `includeAttachments/IncludeAttachments`, `internetMessageId/InternetMessageId`, `extractSensitivityLabel`, `fetchSensitivityLabelMetadata`, `version`. |
| `listEmails(options)` | Query a folder for messages. | `folderId/folderPath`, `to`, `cc`, `toOrCc/ToOrCc`, `from`, `importance`, `fetchOnlyWithAttachment/hasAttachment`, `subjectFilter/subject`, `fetchOnlyUnread/unreadOnly`, `fetchOnlyFlagged/flaggedOnly`, `mailboxAddress/MailboxAddress`, `includeAttachments/IncludeAttachments`, `searchQuery/search/SearchQuery`, `top/Top`, `version`. |
| `draftEmail(options)` | Create or prepare a draft. | Same aliases as `sendEmail`, plus `messageId/id`, `draftType/type`, `comment/Comment`. |
| `updateDraftEmail(messageId, options)` | Patch an existing draft. | Same aliases as `draftEmail`, with `messageId/id` required. |
| `sendDraftEmail(messageId)` | Send an existing draft. | `messageId/id`. |
| `forwardEmail(messageId, options)` | Forward a message. | `messageId/id`, `to/To/toRecipients/ToRecipients`, `comment/Comment`, `mailboxAddress/MailboxAddress`. |
| `replyToEmail(messageId, options)` | Reply or reply-all. | `messageId/id`, `comment/body/Body`, `replyAll/ReplyAll`, `to/To`, `cc/Cc`, `bcc/Bcc`, `subject/Subject`, `importance/Importance`, `attachments/Attachments`, `isHtml/IsHtml`, `mailboxAddress/MailboxAddress`. |
| `sendFromSharedMailbox(mailboxAddress, options)` | Send from a shared mailbox. | `mailboxAddress/MailboxAddress`, plus the aliases supported by `sendEmail`. |
| `moveEmail(messageId, destination, options)` | Move a message to another folder. | `messageId`, `folderPath/folderId/destinationFolderId`, `mailboxAddress/MailboxAddress`. |
| `deleteEmail(messageId, options)` | Delete a message. | `messageId/id`, `mailboxAddress/MailboxAddress`. |
| `markEmailAsRead(messageId, options)` | Mark a message as read using the V3 endpoint. | `messageId/id`, `isRead`, `body`, `mailboxAddress/MailboxAddress`, `version`. |
| `updateEmailFlag(messageId, options)` | Flag or update flag state on a message. | `messageId/id`, `flagStatus/status`, `flag`, `body`, `mailboxAddress/MailboxAddress`. |
| `getEmailAttachment(messageId, attachmentId, options)` | Download attachment metadata or content. | `messageId/id`, `attachmentId/AttachmentId`, `mailboxAddress/MailboxAddress`, `extractSensitivityLabel`, `fetchSensitivityLabelMetadata`. |
| `listOutlookCategories()` | Fetch available Outlook categories. | No aliases. |
| `assignOutlookCategory(messageId, category)` | Assign a category to a single message. | `messageId/id`, `category/categoryName`. |
| `assignOutlookCategoryBulk(messageIds, categoryName)` | Assign a category to multiple messages. | `messageIds/ids`, `category/categoryName`. |

## Calendar helpers

| Export | Purpose | Accepted aliases |
| --- | --- | --- |
| `createEvent(options)` | Create a Graph-style event. | `subject/Subject/title`, `start/Start/startWithTimeZone`, `end/End/endWithTimeZone`, `timeZone/TimeZone/timezone/StartTimeZone/EndTimeZone`, `attendees/requiredAttendees/RequiredAttendees`, `optionalAttendees/OptionalAttendees`, `resourceAttendees/ResourceAttendees`, `body/Body`, `categories/Categories`, `location/Location`, `importance/Importance`, `isAllDay/IsAllDay`, `recurrence/Recurrence`, `selectedDaysOfWeek/SelectedDaysOfWeek`, `recurrenceEnd/RecurrenceEnd`, `numberOfOccurences/numberOfOccurrences/NumberOfOccurrences`, `reminderMinutesBeforeStart/Reminder/reminder`, `isReminderOn/IsReminderOn`, `showAs/ShowAs`, `responseRequested/ResponseRequested`, `sensitivity/Sensitivity`, `calendarId/table`. |
| `getEvent(eventId, calendarId, options)` | Load a single event. | `eventId/id`, `calendarId/table`. |
| `listEvents(options)` | Query events for a calendar. | `calendarId/table`, `filter/$filter`, `orderBy/$orderby`, `top/$top`, `skip/$skip`. |
| `editEvent(eventId, changedFields, calendarId)` | Patch an event using the same field aliases as `createEvent`. | `eventId/id`, the field aliases from `createEvent`, `calendarId/table`. |
| `deleteEvent(eventId, calendarId, options)` | Delete an event. | `eventId/id`, `calendarId/table`. |
| `listCalendars(options)` | List calendars. | `skip`, `top`, `orderBy/$orderby`. |
| `getCalendarView(options)` | Get calendar view items for a date range. | `calendarId/table`, `startDateTimeUtc/start/startDateTime`, `endDateTimeUtc/end/endDateTime`, `filter/$filter`, `orderBy/$orderby`, `top/$top`, `skip/$skip`, `search`. |
| `respondToEventInvite(eventId, response, options)` | Accept, tentatively accept, or decline an invite. | `eventId/id`, `response/action`, `comment/Comment`, `sendResponse/SendResponse`, `body`. |
| `listRoomLists()` | List room lists. | No aliases. |
| `listRooms()` | List all rooms. | No aliases. |
| `listRoomsInRoomList(roomList)` | List rooms for a room list. | `roomList/id/name`. |
| `findMeetingTimes(request)` | Call the Graph meeting suggestion endpoint. | `body`, or pass the raw request object directly. |

## Mailbox settings helpers

| Export | Purpose | Accepted aliases |
| --- | --- | --- |
| `setAutomaticReplies(settings)` | Update automatic replies using legacy V1 or Graph V2 depending on shape. | Legacy: `clientSetting` or raw legacy fields like `Status`, `ExternalAudience`, `ScheduledStartDateTimeOffset`, `ScheduledEndDateTimeOffset`, `InternalReplyMessage`, `ExternalReplyMessage`. Graph V2: `body`, or pass the raw mailbox settings object. |
| `getMailTips(request)` | Get mail tips for a mailbox or a V2 body request. | String mailbox address, `mailboxAddress`, or `body`. |

## Contact helpers

| Export | Purpose | Accepted aliases |
| --- | --- | --- |
| `listContactFolders()` | List available contact folders. | No aliases. |
| `listContacts(folderId, options)` | List contacts in a folder. | `folderId/folder/table`, `filter/$filter`, `orderBy/$orderby`, `top/$top`, `skip/$skip`. |
| `getContact(folderId, contactId, options)` | Load a single contact. | `folderId/folder/table`, `contactId/id`. |
| `createContact(folderId, contact)` | Create a contact. | `folderId/folder/table`, `item`, or pass the raw contact object. |
| `updateContact(folderId, contactId, contact)` | Update a contact. | `folderId/folder/table`, `contactId/id`, `item`, or pass the raw contact object. |
| `deleteContact(folderId, contactId, options)` | Delete a contact. | `folderId/folder/table`, `contactId/id`. |

## Advanced helpers

| Export | Purpose | Accepted aliases |
| --- | --- | --- |
| `callOutlookHttpRequest(options)` | Raw Outlook connector HTTP request helper. | `uri`, `method`, `body`, `contentType`, `customHeaders[]`. |
| `manageOutlookEmails(queryRequest, sessionId)` | MCP email workflow endpoint. | `queryRequest`, `sessionId`. |
| `manageOutlookMeetings(queryRequest, sessionId)` | MCP meeting workflow endpoint. | `queryRequest`, `sessionId`. |
| `manageOutlookContacts(queryRequest, sessionId)` | MCP contact workflow endpoint. | `queryRequest`, `sessionId`. |