VERSION 5.00
Begin VB.Form OutputCompleteEventDlg 
   Caption         =   "EJSample_Step5"
   ClientHeight    =   1035
   ClientLeft      =   60
   ClientTop       =   345
   ClientWidth     =   3825
   LinkTopic       =   "Form1"
   ScaleHeight     =   1035
   ScaleWidth      =   3825
   StartUpPosition =   3  'Windows Default
   Begin VB.CommandButton Ok 
      Caption         =   "OK"
      Height          =   375
      Left            =   1200
      TabIndex        =   1
      Top             =   600
      Width           =   1335
   End
   Begin VB.Label OutputCompleteEventMessageLabel 
      Caption         =   "OutputCompleteEventMessage"
      Height          =   375
      Left            =   120
      TabIndex        =   0
      Top             =   120
      Width           =   4095
   End
End
Attribute VB_Name = "OutputCompleteEventDlg"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Private Sub Ok_Click()

    Me.Hide

End Sub
