VERSION 5.00
Object = "{CCB90100-B81E-11D2-AB74-0040054C3719}#1.0#0"; "OPOSLineDisplay.ocx"
Begin VB.Form Step4 
   BorderStyle     =   1  'Fixed Single
   Caption         =   "Step 4 Display in a teletype mode."
   ClientHeight    =   3060
   ClientLeft      =   3045
   ClientTop       =   3330
   ClientWidth     =   4635
   LinkTopic       =   "MDIForm1"
   MaxButton       =   0   'False
   MinButton       =   0   'False
   ScaleHeight     =   3060
   ScaleWidth      =   4635
   Begin VB.CommandButton Command1 
      Caption         =   "Clear"
      Height          =   450
      Left            =   315
      TabIndex        =   4
      Top             =   315
      Width           =   2250
   End
   Begin VB.CommandButton Command4 
      Caption         =   "Teletype Characters"
      Height          =   450
      Left            =   315
      TabIndex        =   3
      Top             =   2205
      Width           =   2250
   End
   Begin VB.CommandButton Command3 
      Caption         =   "Blink Characters"
      Height          =   450
      Left            =   315
      TabIndex        =   2
      Top             =   1575
      Width           =   2250
   End
   Begin VB.CommandButton Command2 
      Caption         =   "Specify Position"
      Height          =   450
      Left            =   315
      TabIndex        =   1
      Top             =   945
      Width           =   2250
   End
   Begin VB.CommandButton cmdExit 
      Caption         =   "Close"
      Height          =   345
      Left            =   3465
      TabIndex        =   0
      Top             =   105
      Width           =   990
   End
   Begin OposLineDisplay_CCOCtl.OPOSLineDisplay OPOSLineDisplay1 
      Left            =   3720
      OleObjectBlob   =   "sDisplay4.frx":0000
      Top             =   720
   End
End
Attribute VB_Name = "Step4"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
'Step 4 Display in a teletype mode.
Option Explicit

Private Sub cmdExit_Click()

    Unload Me

End Sub

'Clear the text on the window
'
Private Sub Command1_Click()

    OPOSLineDisplay1.ClearText

End Sub

'Display the text as specified.
'
Private Sub Command2_Click()

    OPOSLineDisplay1.DisplayTextAt 1, 5, "Hello OPOS.", DISP_DT_NORMAL

End Sub


'Display the blinking text
'
Private Sub Command3_Click()

    OPOSLineDisplay1.DisplayText "Blink", DISP_DT_BLINK

End Sub

'Teletype display
'
Private Sub Command4_Click()

' Set to display the text at one second interval.
    OPOSLineDisplay1.InterCharacterWait = 1000
    OPOSLineDisplay1.DisplayText "Teletype", DISP_DT_NORMAL

End Sub

Private Sub Command4_LostFocus()

    OPOSLineDisplay1.InterCharacterWait = 0

End Sub

Private Sub Form_Load()

    With OPOSLineDisplay1
        .Open "Unit1"
        .ClaimDevice 1000
        If .CapPowerReporting <> OPOS_PR_NONE Then
            .PowerNotify = OPOS_PN_ENABLED
        End If
        .DeviceEnabled = True
    End With

End Sub

Private Sub Form_Unload(Cancel As Integer)

    With OPOSLineDisplay1
        .ClearText
        .DeviceEnabled = False
        .ReleaseDevice
        .Close
    End With

End Sub
